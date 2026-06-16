import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly username!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  readonly password!: string;
}
