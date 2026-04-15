import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({ example: 'feature_123' })
  @IsString()
  featureId: string;

  @ApiPropertyOptional({ example: 'Feature walkthrough' })
  @IsOptional()
  @IsString()
  title?: string;
}
