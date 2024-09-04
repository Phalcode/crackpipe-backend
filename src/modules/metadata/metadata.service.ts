import {
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { validateOrReject } from "class-validator";

import configuration from "../../configuration";
import { GamesService } from "../games/games.service";
import { GamevaultGame } from "../games/gamevault-game.entity";
import { GameMetadata } from "./games/game.metadata.entity";
import { GameMetadataService } from "./games/game.metadata.service";
import { MinimalGameMetadataDto } from "./games/minimal-game.metadata.dto";
import { MetadataProvider } from "./providers/abstract.metadata-provider.service";

@Injectable()
export class MetadataService {
  private readonly logger = new Logger(this.constructor.name);
  providers: MetadataProvider[] = [];

  constructor(
    @Inject(forwardRef(() => GamesService))
    private gamesService: GamesService,
    private gameMetadataService: GameMetadataService,
  ) {}

  /**
   * Registers a metadata provider.
   * If a provider with the same slug or priority already exists, throws a ConflictException.
   * Validates the provider using class-validator and throws an InternalServerErrorException if validation fails.
   * Sorts the providers by priority in ascending order.
   */
  registerProvider(provider: MetadataProvider) {
    // Check if a provider with the same slug or priority already exists
    const existingProvider = this.providers.find(
      (p) => p.slug === provider.slug || p.priority === provider.priority,
    );

    if (existingProvider) {
      const errorMessage =
        `There is already a provider (${existingProvider.slug}) with the ` +
        (provider.slug === existingProvider.slug
          ? `same slug (${provider.slug})`
          : `same priority (${provider.priority})`);
      throw new ConflictException(errorMessage);
    }

    // Validate the provider using class-validator
    validateOrReject(provider).catch((errors) => {
      this.logger.error({
        message: `Failed to register metadata provider.`,
        provider: provider.getLoggableData(),
        errors,
      });
    });

    // Add the provider to the list of providers
    this.providers.push(provider);

    // Sort the providers by priority in descending order
    this.providers.sort((a, b) => b.priority - a.priority);

    // Log the registration of the metadata provider
    this.logger.log({
      message: `Registered metadata provider.`,
      slug: provider.slug,
      priority: provider.priority,
    });
  }

  /**
   * Retrieves a metadata provider by its slug.
   * If no provider is found, it throws a NotFoundException.
   */
  getProviderBySlugOrFail(slug: string): MetadataProvider {
    if (!slug) {
      throw new NotFoundException(`No slug provided.`);
    }

    // Find the provider with the given slug.
    const provider = this.providers.find((provider) => provider.slug === slug);

    // If no provider is found, throw a NotFoundException.
    if (!provider) {
      throw new NotFoundException(
        `There is no registered provider with slug "${slug}".`,
      );
    }

    // Return the found provider.
    return provider;
  }

  /**
   * Checks the metadata of games and updates them if necessary.
   */
  async check(games: GamevaultGame[]): Promise<void> {
    for (const game of games) {
      try {
        await this.updateMetadata(game.id);
      } catch (error) {
        this.logger.warn({
          message: "Error checking metadata for game.",
          game: game.getLoggableData(),
          error,
        });
      }
    }
  }

  /**
   * Updates the metadata of a game if necessary.
   * If the game's file path contains "(NC)", the metadata update is skipped.
   * If the game's metadata is already up to date (i.e. the TTL has not been exceeded),
   * the metadata update is skipped.
   * If the metadata update fails for a provider, the error is logged and the update is skipped.
   * @param game The game to update the metadata for.
   * @returns The updated game.
   */
  private async updateMetadata(gameId: number): Promise<GamevaultGame> {
    const game = await this.gamesService.findOneByGameIdOrFail(gameId, {
      loadDeletedEntities: false,
    });

    this.logger.log({
      message: "Updating metadata.",
      game: game.getLoggableData(),
    });

    // If the game's file path contains "(NC)", skip the metadata update.
    if (game.file_path.includes("(NC)")) {
      this.logger.debug({
        message: "Skipping metadata update for (NC) game.",
        game: game.getLoggableData(),
      });
      return game;
    }

    let changeCount = 0;
    for (const provider of this.providers) {
      try {
        // Find the existing provider metadata for the game and provider.
        const existingProviderMetadata = game.provider_metadata.find(
          (metadata) => metadata.provider_slug === provider.slug,
        );

        // If the existing provider metadata is already up to date, skip the update.
        if (
          existingProviderMetadata &&
          (existingProviderMetadata.updated_at ??
            existingProviderMetadata.created_at) >
            new Date(
              Date.now() -
                configuration.METADATA.TTL_IN_DAYS * 24 * 60 * 60 * 1000,
            )
        ) {
          this.logger.debug({
            message: "Metadata is already up to date. Skipping.",
            game: game.getLoggableData(),
            provider: provider.getLoggableData(),
          });
          continue;
        }

        // If the existing provider metadata is not up to date, update it.
        if (existingProviderMetadata) {
          await this.map(
            game.id,
            provider.slug,
            existingProviderMetadata.provider_data_id,
            undefined,
          );
        } else {
          // If the existing provider metadata is not found, find the metadata.
          await this.findMetadata(game, provider);
        }
        changeCount++;
      } catch (error) {
        // If the metadata update fails, log the error and skip the update.
        this.logger.error({
          message: "Failed updating metadata for game and provider. Skipping.",
          game: game.getLoggableData(),
          provider: provider.getLoggableData(),
          error,
        });
      }
    }

    // If no metadata changes were made, return the game without merging the metadata.
    if (changeCount === 0) {
      this.logger.debug({
        message: "No metadata changes. Skipping merge.",
        game: game.getLoggableData(),
      });
      return game;
    }

    // Merge the updated metadata and return the updated game.
    return this.merge(game.id);
  }

  /**
   * Checks the metadata of a single provider and updates it if necessary.
   */
  private async findMetadata(
    game: GamevaultGame,
    provider: MetadataProvider,
  ): Promise<void> {
    this.logger.log({
      message: "Searching for metadata.",
      provider: provider.getLoggableData(),
      game: game.getLoggableData(),
    });
    try {
      const bestMatchingGame = await provider.getBestMatch(game);
      await this.map(
        game.id,
        provider.slug,
        bestMatchingGame.provider_data_id,
        undefined,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.debug({
          message: "No matching game found.",
          game: game.getLoggableData(),
          provider: provider.getLoggableData(),
        });
        return;
      }
      throw error;
    }
  }

  /**
   * Searches for metadata of a game using a specific provider.
   */
  async search(
    query: string,
    providerSlug: string,
  ): Promise<MinimalGameMetadataDto[]> {
    const results = this.getProviderBySlugOrFail(providerSlug).search(query);
    this.logger.debug({
      message: "Searched for metadata.",
      provider: providerSlug,
      query,
      results,
    });
    return results;
  }

  async merge(gameId: number): Promise<GamevaultGame> {
    const game = await this.gamesService.findOneByGameIdOrFail(gameId, {
      loadDeletedEntities: false,
    });

    if (!game.provider_metadata.length && !game.user_metadata) {
      this.logger.warn({
        message: "No metadata found to merge.",
        game: gameId,
      });
      return game;
    }

    // Sort the provider metadata by priority in ascending order
    const providerMetadata = game.provider_metadata.toSorted((a, b) => {
      return (
        (a.provider_priority ??
          this.getProviderBySlugOrFail(a.provider_slug).priority) -
        (b.provider_priority ??
          this.getProviderBySlugOrFail(b.provider_slug).priority)
      );
    });

    const userMetadata = JSON.parse(
      JSON.stringify(game.user_metadata),
    ) as GameMetadata;

    let mergedMetadata = new GameMetadata();

    // Create New Effective Metadata by applying the priorotized metadata one by one
    for (const metadata of providerMetadata) {
      // Delete all empty fields of provider so only delta is overwritten
      Object.keys(metadata).forEach((key) => {
        if (metadata[key] == null) {
          delete metadata[key];
        }
        if (Array.isArray(metadata[key]) && metadata[key].length === 0) {
          delete metadata[key];
        }
      });

      mergedMetadata = {
        ...mergedMetadata,
        ...metadata,
      } as GameMetadata;
    }

    // Apply the users changes on top
    if (userMetadata) {
      // Delete all empty fields of dto.user_metadata so only delta is overwritten
      Object.keys(userMetadata)?.forEach((key) => {
        if (userMetadata[key] == null) {
          delete userMetadata[key];
        }
        if (
          Array.isArray(userMetadata[key]) &&
          userMetadata[key].length === 0
        ) {
          delete userMetadata[key];
        }
      });

      mergedMetadata = {
        ...mergedMetadata,
        ...userMetadata,
      } as GameMetadata;
    }

    // Apply the merged metadata to the game
    mergedMetadata = {
      ...mergedMetadata,
      ...{
        id: game.metadata?.id || undefined,
        provider_slug: "gamevault",
        provider_data_id: gameId.toString(),
        provider_priority: null,
      },
    } as GameMetadata;

    mergedMetadata.genres?.forEach((genre) => {
      genre.id = undefined;
      genre.provider_slug = "gamevault";
      genre.provider_data_id = genre.provider_data_id || genre.name;
    });

    mergedMetadata.tags?.forEach((tag) => {
      tag.id = undefined;
      tag.provider_slug = "gamevault";
      tag.provider_data_id = tag.provider_data_id || tag.name;
    });

    mergedMetadata.developers?.forEach((developer) => {
      developer.id = undefined;
      developer.provider_slug = "gamevault";
      developer.provider_data_id = developer.provider_data_id || developer.name;
    });

    mergedMetadata.publishers?.forEach((publisher) => {
      publisher.id = undefined;
      publisher.provider_slug = "gamevault";
      publisher.provider_data_id = publisher.provider_data_id || publisher.name;
    });

    // Save the merged metadata
    game.metadata = await this.gameMetadataService.save(mergedMetadata);
    const mergedGame = await this.gamesService.save(game);
    this.logger.debug({
      message: "Merged metadata.",
      game: mergedGame.getLoggableData(),
      details: mergedGame,
    });
    return mergedGame;
  }

  /**
   * Removes metadata from the game. Does not remove user provided metadata.

   */
  async unmap(gameId: number, providerSlug: string) {
    // Find the game by gameId.
    const game = await this.gamesService.findOneByGameIdOrFail(gameId, {
      loadDeletedEntities: false,
    });

    // Clear the effective metadata.
    game.provider_metadata = game.provider_metadata.filter(
      (metadata) => metadata.provider_slug !== providerSlug,
    );
    this.logger.log({
      message: "Unmapped metadata provider from a game.",
      game: game.getLoggableData(),
      providerSlug,
    });

    if (game.metadata) {
      // Clear the merged metadata.
      await this.gameMetadataService.deleteByGameMetadataIdOrFail(
        game.metadata.id,
      );
      game.metadata = null;
      this.logger.debug({
        message: "Deleted merged metadata for a game.",
        game: game.getLoggableData(),
        providerSlug,
      });
    }

    // Clear the user metadata if necessary.
    if (providerSlug === "user" && game.user_metadata?.id) {
      await this.gameMetadataService.deleteByGameMetadataIdOrFail(
        game.user_metadata.id,
      );
      game.user_metadata = null;
      this.logger.log({
        message: "Deleted user metadata from a game.",
        game: game.getLoggableData(),
        providerSlug,
      });
    }

    return this.gamesService.save(game);
  }

  /**
   * Maps the metadata of a game provider to a game, overwriting the existing one if necessary.
   * Metadata usually needs to be merged after to be effective.
   */
  async map(
    gameId: number,
    providerSlug: string,
    providerGameId: string,
    providerPriority: number,
  ) {
    const provider = this.getProviderBySlugOrFail(providerSlug);
    const metadata = await provider.getByProviderDataIdOrFail(providerGameId);

    if (providerPriority != null) {
      metadata.provider_priority = providerPriority;
    }

    const game = await this.unmap(gameId, providerSlug);
    game.provider_metadata.push(await this.gameMetadataService.save(metadata));
    const mappedGame = await this.gamesService.save(game);
    this.logger.log({
      message: "Mapped metadata provider to a game.",
      game: mappedGame.getLoggableData(),
      providerSlug,
    });
    return mappedGame;
  }
}
