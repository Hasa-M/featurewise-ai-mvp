import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListContextFilesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  readonly cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  readonly limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly query?: string;
}
