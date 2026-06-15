import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateProjectDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(120)
  readonly name!: string;
}
