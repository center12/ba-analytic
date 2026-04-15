-- CreateEnum for FeatureSyncStatus
CREATE TYPE "FeatureSyncStatus" AS ENUM ('IN_SYNC', 'OUT_OF_SYNC', 'DIVERGED');

-- AlterTable Feature to add SSR extraction & sync tracking fields
ALTER TABLE "Feature" ADD COLUMN "extractedFromSSRId" TEXT,
ADD COLUMN "extractedRequirementIds" JSONB,
ADD COLUMN "syncStatus" "FeatureSyncStatus" NOT NULL DEFAULT 'IN_SYNC',
ADD COLUMN "lastSyncedWithSSRAt" TIMESTAMP(3);

-- AddForeignKey for extractedFromSSRId
ALTER TABLE "Feature" ADD CONSTRAINT "Feature_extractedFromSSRId_fkey" FOREIGN KEY ("extractedFromSSRId") REFERENCES "Feature"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex for efficient queries on extracted features
CREATE INDEX "Feature_extractedFromSSRId_idx" ON "Feature"("extractedFromSSRId");

-- CreateIndex for efficient queries on sync status filtering
CREATE INDEX "Feature_extractedFromSSRId_syncStatus_idx" ON "Feature"("extractedFromSSRId", "syncStatus");

-- DataMigration: backfill extractedFromSSRId for features already extracted from SSRs.
-- Logic: if a FEATURE has relatedFeatureIds containing the id of an existing SSR feature,
-- set extractedFromSSRId to that SSR's id and mark lastSyncedWithSSRAt = createdAt.
UPDATE "Feature" AS child
SET
  "extractedFromSSRId"  = parent.id,
  "lastSyncedWithSSRAt" = child."createdAt"
FROM "Feature" AS parent
WHERE
  child."featureType"           = 'FEATURE'
  AND parent."featureType"      = 'SSR'
  AND child."relatedFeatureIds" IS NOT NULL
  AND child."relatedFeatureIds" @> to_jsonb(parent.id)
  AND child."extractedFromSSRId" IS NULL;
