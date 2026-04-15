import { IsString, IsOptional, IsEnum } from 'class-validator';
import type { FeatureSyncStatus } from '@prisma/client';
import type { SyncWarning } from '../helpers/change-detection.types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SyncActionDto {
  @ApiProperty({ enum: ['update', 'keep', 'remove'] })
  @IsEnum(['update', 'keep', 'remove'])
  action: 'update' | 'keep' | 'remove';

  @ApiPropertyOptional({ example: 'Keep the current implementation intentionally.' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SyncStatusDto {
  @ApiProperty({ example: 'feature_123' })
  id: string;

  @ApiPropertyOptional({ example: 'FEA-001' })
  code: string | null;

  @ApiProperty({ example: 'User management dashboard' })
  name: string;

  @ApiProperty({ example: 'IN_SYNC' })
  syncStatus: FeatureSyncStatus;

  @ApiPropertyOptional({ example: 'feature_ssr_123', nullable: true })
  extractedFromSSRId: string | null;

  @ApiPropertyOptional({ type: String, isArray: true, nullable: true })
  extractedRequirementIds: string[] | null;

  @ApiPropertyOptional({ example: '2026-04-15T12:00:00.000Z', nullable: true, type: String, format: 'date-time' })
  lastSyncedWithSSRAt: Date | null;
}

export class SSRSyncWarningsResponseDto {
  @ApiProperty({ example: 'feature_ssr_123' })
  featureId: string;

  @ApiProperty({
    description: 'Conflict details returned by SSR change detection.',
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  syncWarnings: SyncWarning[];

  @ApiProperty({ example: true })
  hasConflicts: boolean;
}
