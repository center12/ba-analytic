-- AlterTable
ALTER TABLE "DeveloperTask" ADD COLUMN     "userStoryIds" JSONB;

-- AlterTable
ALTER TABLE "Feature" ADD COLUMN     "layer1Mapping" TEXT,
ADD COLUMN     "layer1SSR" TEXT,
ADD COLUMN     "layer1Stories" TEXT,
ADD COLUMN     "layer1Validation" TEXT;

-- AlterTable
ALTER TABLE "TestCase" ADD COLUMN     "requirementRefs" JSONB;
