import { IsString, MaxLength } from 'class-validator';

export class UpdateFeatureContextDto {
  @IsString()
  @MaxLength(20000)
  readonly content!: string;
}
