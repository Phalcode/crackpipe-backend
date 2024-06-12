import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Column, Entity, Index, ManyToMany } from "typeorm";

import { DatabaseEntity } from "../../database/database.entity";
import { GameMetadata } from "./game-metadata.entity";

@Entity()
export class PublisherMetadata extends DatabaseEntity {
  @Column()
  @Index()
  @ApiProperty({
    description: "provider slug of the metadata",
  })
  metadata_provider: string;

  @Column()
  @Index()
  @ApiPropertyOptional({
    description: "id of the developer from the provider",
    example: "1190",
  })
  metadata_provider_id?: string;

  @Index()
  @Column({ unique: true })
  @ApiProperty({
    example: "Rockstar Games",
    description: "name of the publisher",
  })
  name: string;

  @ManyToMany(() => GameMetadata, (game) => game.publishers)
  @ApiProperty({
    description: "games published by the publisher",
    type: () => GameMetadata,
    isArray: true,
  })
  games: GameMetadata[];
}
