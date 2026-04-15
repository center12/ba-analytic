import { IsString, IsOptional, IsArray, IsEnum, MinLength } from 'class-validator';
import { FeatureType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFeatureDto {
  @ApiProperty({ example: 'User management dashboard' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional({ example: 'Admin users can review and manage user accounts.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '## Goal\nCreate a dashboard for user management...' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ enum: FeatureType })
  @IsOptional()
  @IsEnum(FeatureType)
  featureType?: FeatureType;

  @ApiPropertyOptional({ type: String, isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedFeatureIds?: string[];

  /** FK to the parent SSR Feature this was extracted from. */
  @ApiPropertyOptional({ example: 'feature_ssr_123' })
  @IsOptional()
  @IsString()
  extractedFromSSRId?: string;

  /** IDs of the user stories / requirements this feature implements (e.g. ["US-01", "US-02"]). */
  @ApiPropertyOptional({ type: String, isArray: true, example: ['US-01', 'US-02'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extractedRequirementIds?: string[];
}

export class UpdateFeatureDto {
  @ApiPropertyOptional({ example: 'User management dashboard' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ example: 'Updated feature description.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Updated Markdown content.' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ enum: FeatureType })
  @IsOptional()
  @IsEnum(FeatureType)
  featureType?: FeatureType;

  @ApiPropertyOptional({ type: String, isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedFeatureIds?: string[];
}
