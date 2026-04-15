import { IsString, IsOptional, IsEnum } from 'class-validator';
import type { FeatureSyncStatus } from '@prisma/client';
import type { SyncWarning } from '../helpers/change-detection.types';

export class SyncActionDto {
  @IsEnum(['update', 'keep', 'remove'])
  action: 'update' | 'keep' | 'remove';

  @IsOptional()
  @IsString()
  reason?: string;
}

export class SyncStatusDto {
  id: string;
  code: string | null;
  name: string;
  syncStatus: FeatureSyncStatus;
  extractedFromSSRId: string | null;
  extractedRequirementIds: string[] | null;
  lastSyncedWithSSRAt: Date | null;
}

export class SSRSyncWarningsResponseDto {
  featureId: string;
  syncWarnings: SyncWarning[];
  hasConflicts: boolean;
}
