import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { FeatureAnalysisPriority, FeatureAnalysisStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFeatureAnalysisDto {
  @ApiPropertyOptional({ example: 'Verify dashboard permissions' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Ensure a manager can access the dashboard.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'A manager account exists and is logged in.' })
  @IsOptional()
  @IsString()
  preconditions?: string;

  @ApiPropertyOptional({ enum: FeatureAnalysisPriority })
  @IsOptional()
  @IsEnum(FeatureAnalysisPriority)
  priority?: FeatureAnalysisPriority;

  @ApiPropertyOptional({ enum: FeatureAnalysisStatus })
  @IsOptional()
  @IsEnum(FeatureAnalysisStatus)
  status?: FeatureAnalysisStatus;

  @ApiPropertyOptional({
    type: 'array',
    items: {
      type: 'object',
      required: ['action', 'expectedResult'],
      properties: {
        action: { type: 'string', example: 'Open the dashboard' },
        expectedResult: { type: 'string', example: 'The dashboard loads successfully' },
      },
    },
  })
  @IsOptional()
  @IsArray()
  steps?: { action: string; expectedResult: string }[];
}
