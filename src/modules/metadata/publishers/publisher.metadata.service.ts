import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { DeletedEntitiesFilter } from "../../../filters/deleted-entities.filter";
import { FindOptions } from "../../../globals";
import { PublisherMetadata } from "./publisher.metadata.entity";

@Injectable()
export class PublisherMetadataService {
  private readonly logger = new Logger(this.constructor.name);
  constructor(
    @InjectRepository(PublisherMetadata)
    private publisherRepository: Repository<PublisherMetadata>,
  ) {}

  async find(
    provider_slug: string = "gamevault",
    options: FindOptions = { loadDeletedEntities: false, loadRelations: false },
  ): Promise<PublisherMetadata[]> {
    let relations = [];

    if (options.loadRelations) {
      if (options.loadRelations === true) {
        relations = ["games"];
      } else if (Array.isArray(options.loadRelations))
        relations = options.loadRelations;
    }

    const publishers = await this.publisherRepository.find({
      where: { provider_slug: provider_slug },
      relations,
      withDeleted: options.loadDeletedEntities,
      relationLoadStrategy: "query",
    });

    return DeletedEntitiesFilter.filterDeleted(
      publishers,
    ) as PublisherMetadata[];
  }

  async upsert(publisher: PublisherMetadata): Promise<PublisherMetadata> {
    const existingPublisher = await this.publisherRepository.findOne({
      where: {
        provider_slug: publisher.provider_slug,
        provider_data_id: publisher.provider_data_id,
      },
    });

    return this.publisherRepository.save({
      ...existingPublisher,
      ...publisher,
    });
  }
}
