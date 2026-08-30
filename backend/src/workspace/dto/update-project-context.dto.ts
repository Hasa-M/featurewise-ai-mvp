import { IsString, MaxLength } from 'class-validator';

export class UpdateProjectContextDto {
  @IsString()
  @MaxLength(20000)
  readonly content!: string;
}
