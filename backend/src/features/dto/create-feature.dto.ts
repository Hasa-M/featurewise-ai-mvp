import { FeatureOrigin } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateFeatureDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(180)
  readonly title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  readonly brief?: string | null;

  @IsEnum(FeatureOrigin)
  readonly origin!: FeatureOrigin;

  @IsOptional()
  @IsBoolean()
  readonly includeInProjectContext?: boolean;
}
