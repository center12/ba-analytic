import { IsString, IsOptional, IsArray, IsEnum, MinLength } from 'class-validator';
import { FeatureType } from '@prisma/client';

export class CreateFeatureDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(FeatureType)
  featureType?: FeatureType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedFeatureIds?: string[];

  /** FK to the parent SSR Feature this was extracted from. */
  @IsOptional()
  @IsString()
  extractedFromSSRId?: string;

  /** IDs of the user stories / requirements this feature implements (e.g. ["US-01", "US-02"]). */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extractedRequirementIds?: string[];
}

export class UpdateFeatureDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(FeatureType)
  featureType?: FeatureType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedFeatureIds?: string[];
}
