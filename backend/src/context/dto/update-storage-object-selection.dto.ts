import { IsBoolean } from 'class-validator';

export class UpdateStorageObjectSelectionDto {
  @IsBoolean()
  readonly selected!: boolean;
}
