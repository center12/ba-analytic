-- CreateTable
CREATE TABLE "PipelineTokenUsage" (
    "id" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineTokenUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PipelineTokenUsage_featureId_idx" ON "PipelineTokenUsage"("featureId");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineTokenUsage_featureId_step_section_key" ON "PipelineTokenUsage"("featureId", "step", "section");

-- AddForeignKey
ALTER TABLE "PipelineTokenUsage" ADD CONSTRAINT "PipelineTokenUsage_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;
