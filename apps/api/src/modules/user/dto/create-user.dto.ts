import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'admin_user', minLength: 3, maxLength: 30 })
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9_]+$/, {
    message:
      'Username may only contain lowercase letters, numbers, and underscores',
  })
  username: string;

  @ApiProperty({ example: 'changeme123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}
