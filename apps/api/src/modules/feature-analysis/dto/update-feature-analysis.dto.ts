import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { FeatureAnalysisPriority, FeatureAnalysisStatus } from '@prisma/client';

export class UpdateFeatureAnalysisDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  preconditions?: string;

  @IsOptional()
  @IsEnum(FeatureAnalysisPriority)
  priority?: FeatureAnalysisPriority;

  @IsOptional()
  @IsEnum(FeatureAnalysisStatus)
  status?: FeatureAnalysisStatus;

  @IsOptional()
  @IsArray()
  steps?: { action: string; expectedResult: string }[];
}
