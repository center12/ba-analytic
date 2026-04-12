import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAppFeedbackDto {
  @IsString()
  @MinLength(1)
  content: string;

  @IsString()
  @MinLength(1)
  routePath: string;

  @IsOptional()
  @IsString()
  pageTitle?: string;

  @IsOptional()
  @IsString()
  contextLabel?: string;
}
