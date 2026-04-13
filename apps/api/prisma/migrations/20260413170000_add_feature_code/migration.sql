-- AlterTable
ALTER TABLE "Feature" ADD COLUMN "code" TEXT;

-- Backfill existing features with readable codes per project and type
WITH ranked_features AS (
  SELECT
    id,
    "projectId",
    "featureType",
    ROW_NUMBER() OVER (
      PARTITION BY "projectId", "featureType"
      ORDER BY "createdAt", id
    ) AS seq
  FROM "Feature"
)
UPDATE "Feature" AS feature
SET "code" = CASE
  WHEN ranked."featureType" = 'SSR' THEN 'SSR-' || LPAD(ranked.seq::text, 3, '0')
  ELSE 'FEA-' || LPAD(ranked.seq::text, 3, '0')
END
FROM ranked_features AS ranked
WHERE feature.id = ranked.id;

-- Enforce required code and project-scoped uniqueness
ALTER TABLE "Feature" ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX "Feature_projectId_code_key" ON "Feature"("projectId", "code");
