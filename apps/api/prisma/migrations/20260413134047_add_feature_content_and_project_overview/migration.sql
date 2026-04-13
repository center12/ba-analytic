-- CreateEnum
CREATE TYPE "FeatureType" AS ENUM ('SSR', 'FEATURE');

-- AlterTable
ALTER TABLE "Feature" ADD COLUMN     "content" TEXT,
ADD COLUMN     "featureType" "FeatureType" NOT NULL DEFAULT 'FEATURE',
ADD COLUMN     "relatedFeatureIds" JSONB;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "overview" TEXT;
