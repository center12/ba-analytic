import { IsString, IsOptional } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  featureId: string;

  @IsOptional()
  @IsString()
  title?: string;
}
