import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9_]+$/, {
    message:
      'Username may only contain lowercase letters, numbers, and underscores',
  })
  username: string;

  @IsString()
  @MinLength(6)
  password: string;
}
