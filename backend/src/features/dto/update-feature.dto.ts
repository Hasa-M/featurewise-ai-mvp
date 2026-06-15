import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateFeatureDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(180)
  readonly title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  readonly brief?: string | null;

  @IsOptional()
  @IsBoolean()
  readonly includeInProjectContext?: boolean;
}
