import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateFeatureDto {
  @ValidateIf((_object: object, value: unknown) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(180)
  readonly title?: string;

  @ValidateIf((_object: object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(2000)
  readonly specificationContent?: string;
}
