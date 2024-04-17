import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  Entity,
  Column,
  OneToMany,
  ManyToMany,
  Index,
  JoinTable,
  JoinColumn,
  OneToOne,
  RelationId,
} from "typeorm";
import { Developer } from "../developers/developer.entity";
import { Genre } from "../genres/genre.entity";
import { Progress } from "../progress/progress.entity";
import { Publisher } from "../publishers/publisher.entity";
import { Store } from "../stores/store.entity";
import { Tag } from "../tags/tag.entity";
import { Image } from "../images/image.entity";
import { DatabaseEntity } from "../database/database.entity";
import { GameType } from "./models/game-type.enum";
import { GamevaultUser } from "../users/gamevault-user.entity";

@Entity()
export class Game extends DatabaseEntity {
  @Column({ nullable: true })
  @ApiPropertyOptional({
    description: "unique rawg-api-identifier of the game",
    example: 1212,
  })
  rawg_id?: number;

  @Column()
  @Index()
  @ApiProperty({
    description: "title of the game (extracted from the filename)",
    example: "Grand Theft Auto V",
  })
  title: string;

  @Column()
  @Column({ nullable: true })
  @ApiPropertyOptional({
    description:
      "rawg-api-title of the game (a correction needed if different from title)",
    example: "Grand Theft Auto V",
  })
  rawg_title?: string;

  @Column({ nullable: true })
  @ApiPropertyOptional({
    description: "version tag (extracted from the filename e.g. '(v1.0.0)')",
    example: "v1.0.0",
  })
  version?: string;

  @Column({ nullable: true })
  @ApiPropertyOptional({
    description:
      "release date of the game (ideally extracted from the filename; if unavailable, it may be obtained from RAWG).",
    example: "2013-09-17T00:00:00.000Z",
  })
  release_date?: Date;

  @Column({ nullable: true })
  @ApiPropertyOptional({
    description: "release date of the game (from rawg-api)",
    example: "2013-09-17T00:00:00.000Z",
  })
  rawg_release_date?: Date;

  @Column({ nullable: true })
  @ApiPropertyOptional({
    description: "date the game was last updated using the rawg-api",
    example: "2021-03-01T00:00:00.000Z",
  })
  cache_date?: Date;

  @Column({ unique: true })
  @ApiProperty({
    description: "filepath to the game (relative to the root)",
    example: "Grand Theft Auto V (v1.0.0).zip",
  })
  file_path: string;

  @Column({
    type: "bigint",
    default: 0,
    transformer: {
      to: (value) => value,
      from: (value) => {
        if (value) return BigInt(value).toString();
        return value;
      },
    },
  })
  @ApiProperty({
    description: "size of the game file in bytes",
    example: "1234567890",
    type: () => String,
  })
  size: bigint;

  @Column({ nullable: true })
  @ApiPropertyOptional({
    description: "rawg-api description of the game",
    example:
      "An open world action-adventure video game developed by Rockstar North and published by Rockstar Games.",
  })
  description?: string;

  @OneToOne(() => Image, {
    nullable: true,
    eager: true,
    onDelete: "CASCADE",
    orphanedRowAction: "soft-delete",
  })
  @JoinColumn()
  @ApiPropertyOptional({
    description: "box image of the game",
    type: () => Image,
  })
  box_image?: Image;

  @OneToOne(() => Image, {
    nullable: true,
    eager: true,
    onDelete: "CASCADE",
    orphanedRowAction: "soft-delete",
  })
  @JoinColumn()
  @ApiPropertyOptional({
    description: "background image of the game",
    type: () => Image,
  })
  background_image?: Image;

  @Column({ nullable: true })
  @ApiPropertyOptional({
    description: "website url of the game from rawg-api",
    example: "https://www.escapefromtarkov.com/",
  })
  website_url?: string;

  @Column({ nullable: true })
  @ApiPropertyOptional({
    description: "metacritic rating from rawg-api of the game",
    example: 90,
  })
  metacritic_rating?: number;

  @Column({ nullable: true, type: "integer" })
  @ApiPropertyOptional({
    description:
      "average playtime of other people in the game (similar to howlongtobeat.com) from rawg-api (in minutes)",
    example: 180,
  })
  average_playtime?: number;

  @Column()
  @ApiProperty({
    description:
      "indicates if the game is an early access title ('(EA)' Flag in the filename)",
    example: true,
  })
  early_access: boolean;

  @Column({
    type: "simple-enum",
    enum: GameType,
    default: GameType.UNDETECTABLE,
  })
  @ApiProperty({
    description: "type of the game",
    type: "enum",
    enum: GameType,
    example: GameType.WINDOWS_PORTABLE,
  })
  type: GameType;

  @OneToMany(() => Progress, (progress) => progress.game)
  @ApiPropertyOptional({
    description: "progresses associated to the game",
    type: () => Progress,
    isArray: true,
  })
  progresses?: Progress[];

  @JoinTable()
  @ManyToMany(() => Publisher, (publisher) => publisher.games)
  @ApiPropertyOptional({
    description: "publishers of the game",
    type: () => Publisher,
    isArray: true,
  })
  publishers?: Publisher[];

  @JoinTable()
  @ManyToMany(() => Developer, (developer) => developer.games)
  @ApiPropertyOptional({
    description: "developers of the game",
    type: () => Developer,
    isArray: true,
  })
  developers?: Developer[];

  @JoinTable()
  @ManyToMany(() => Store, (store) => store.games)
  @ApiPropertyOptional({
    description: "stores of the game",
    type: () => Store,
    isArray: true,
  })
  stores?: Store[];

  @JoinTable()
  @ManyToMany(() => Tag, (tag) => tag.games)
  @ApiPropertyOptional({
    description: "tags of the game",
    type: () => Tag,
    isArray: true,
  })
  tags?: Tag[];

  @JoinTable()
  @ManyToMany(() => Genre, (genre) => genre.games)
  @ApiPropertyOptional({
    description: "genres of the game",
    type: () => Genre,
    isArray: true,
  })
  genres?: Genre[];

  @ManyToMany(() => GamevaultUser, (user) => user.bookmarked_games)
  @ApiProperty({
    description: "users that bookmarked this game",
    type: () => Game,
    isArray: true,
  })
  bookmarked_users?: GamevaultUser[];

  @RelationId((game: Game) => game.bookmarked_users)
  @ApiProperty({
    description: "ids of users that bookmarked this games",
    type: () => Number,
    isArray: true,
  })
  bookmarked_users_ids?: number[];
}
