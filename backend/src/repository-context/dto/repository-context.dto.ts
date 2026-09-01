import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class PaginationQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) readonly page: number = 1;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  readonly pageSize: number = 50;
}

export class ConnectRepositoryDto {
  @IsString() @Matches(/^[1-9][0-9]*$/) readonly repositoryId!: string;
}

export class UpdateProjectRepositoryDto {
  @IsString() @MaxLength(255) readonly baseBranch!: string;
}

export class RepositoryTreeQueryDto extends PaginationQueryDto {
  @IsString() @MaxLength(255) readonly branch!: string;
  @IsOptional()
  @IsString()
  @Matches(/^[0-9a-f]{40,64}$/i)
  readonly commitSha?: string;
  @IsOptional() @IsString() @MaxLength(4096) readonly path: string = '';
}

export class UpdateFeatureRepositoryContextDto {
  @IsOptional() @IsString() @MaxLength(255) readonly branchOverride!:
    | string
    | null;
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(4096, { each: true })
  readonly selectedPaths!: string[];
}
