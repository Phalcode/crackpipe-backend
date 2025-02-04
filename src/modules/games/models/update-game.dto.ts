import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsOptional, ValidateNested } from "class-validator";

import { UpdateGameUserMetadataDto } from "../../metadata/models/user-game-metadata.dto";
import { MapGameDto } from "./map-game.dto";

export class UpdateGameDto {
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @ApiPropertyOptional({
    description:
      "The mapping requests. If not provided, the game will not be remapped or unmapped.",
    type: MapGameDto,
    isArray: true,
  })
  mapping_requests?: MapGameDto[];

  @IsOptional()
  @ValidateNested()
  @ApiPropertyOptional({
    description:
      "The updated user metadata. If not provided, the games user_metadata will not be updated.",
    type: () => UpdateGameUserMetadataDto,
  })
  user_metadata?: UpdateGameUserMetadataDto;
}
