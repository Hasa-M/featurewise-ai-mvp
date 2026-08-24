import { IsIn, IsOptional } from 'class-validator';

export class StorageObjectAccessQueryDto {
  @IsOptional()
  @IsIn(['inline', 'attachment'])
  readonly disposition?: 'inline' | 'attachment';
}
