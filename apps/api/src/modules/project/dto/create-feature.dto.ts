import { IsString, IsOptional, IsArray, IsEnum, MinLength } from 'class-validator';
import { FeatureType } from '@prisma/client';

export class CreateFeatureDto {
  @IsString()
  @MinLength(1)
  name: string;

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
