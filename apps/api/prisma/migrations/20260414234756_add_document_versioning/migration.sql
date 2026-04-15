-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterTable
ALTER TABLE "Feature" ADD COLUMN     "contentStatus" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "publishedContent" TEXT,
ADD COLUMN     "publishedVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "syncChangeReason" TEXT;

-- CreateTable
CREATE TABLE "FeatureChangelog" (
    "id" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "contentSnapshot" TEXT NOT NULL,
    "changeSummary" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureChangelog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeatureChangelog_featureId_idx" ON "FeatureChangelog"("featureId");

-- AddForeignKey
ALTER TABLE "FeatureChangelog" ADD CONSTRAINT "FeatureChangelog_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;
