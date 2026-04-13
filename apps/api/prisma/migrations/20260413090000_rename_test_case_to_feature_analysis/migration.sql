ALTER TABLE "TestCase" RENAME TO "FeatureAnalysis";

ALTER TABLE "FeatureAnalysis"
RENAME CONSTRAINT "TestCase_pkey" TO "FeatureAnalysis_pkey";

ALTER TABLE "FeatureAnalysis"
RENAME CONSTRAINT "TestCase_featureId_fkey" TO "FeatureAnalysis_featureId_fkey";

ALTER TYPE "TestCasePriority" RENAME TO "FeatureAnalysisPriority";
ALTER TYPE "TestCaseStatus" RENAME TO "FeatureAnalysisStatus";
