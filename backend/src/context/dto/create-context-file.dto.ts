import { IsInt, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

import { MAX_FILE_BYTES } from '../context-file-policy';

export class CreateContextFileDto {
  @IsString()
  @MaxLength(255)
  readonly filename!: string;

  @IsString()
  @MaxLength(255)
  readonly mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_FILE_BYTES)
  readonly sizeBytes!: number;

  @IsString()
  @Matches(/^[A-Za-z0-9+/]{43}=$/, {
    message: 'checksumSha256 must be a base64-encoded SHA-256 digest',
  })
  readonly checksumSha256!: string;
}
