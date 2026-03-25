-- CreateEnum
CREATE TYPE "PipelineStatus" AS ENUM ('IDLE', 'RUNNING', 'FAILED', 'COMPLETED');

-- AlterTable
ALTER TABLE "Feature" ADD COLUMN     "pipelineFailedAt" INTEGER,
ADD COLUMN     "pipelinePartial" JSONB,
ADD COLUMN     "pipelineStatus" "PipelineStatus" NOT NULL DEFAULT 'IDLE';
