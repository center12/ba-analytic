-- Add layerSnapshot to FeatureChangelog to store previous layer state for change detection
ALTER TABLE "FeatureChangelog" ADD COLUMN "layerSnapshot" JSONB;
