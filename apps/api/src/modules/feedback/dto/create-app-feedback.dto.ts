import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAppFeedbackDto {
  @ApiProperty({ example: 'The save button overlaps the sidebar on small screens.' })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiProperty({ example: '/projects/abc/features/fea-001' })
  @IsString()
  @MinLength(1)
  routePath: string;

  @ApiPropertyOptional({ example: 'Feature detail page' })
  @IsOptional()
  @IsString()
  pageTitle?: string;

  @ApiPropertyOptional({ example: 'Pipeline wizard' })
  @IsOptional()
  @IsString()
  contextLabel?: string;
}
