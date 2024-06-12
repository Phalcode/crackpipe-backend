import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { DeletedEntitiesFilter } from "../../../filters/deleted-entities.filter";
import { FindOptions } from "../../../globals";
import { TagMetadata } from "../entities/tag-metadata.entity";

@Injectable()
export class TagMetadataService {
  private readonly logger = new Logger(TagMetadataService.name);

  constructor(
    @InjectRepository(TagMetadata)
    private tagRepository: Repository<TagMetadata>,
  ) {}

  async find(
    metadata_provider: string = "gamevault",
    options: FindOptions = { loadDeletedEntities: false, loadRelations: false },
  ): Promise<TagMetadata[]> {
    let relations = [];

    if (options.loadRelations) {
      if (options.loadRelations === true) {
        relations = ["games"];
      } else if (Array.isArray(options.loadRelations))
        relations = options.loadRelations;
    }

    const tags = await this.tagRepository.find({
      where: { metadata_provider },
      relations,
      withDeleted: options.loadDeletedEntities,
      relationLoadStrategy: "query",
    });

    return DeletedEntitiesFilter.filterDeleted(tags) as TagMetadata[];
  }
}
