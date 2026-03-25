-- CreateEnum
CREATE TYPE "DevTaskCategory" AS ENUM ('API', 'FRONTEND', 'TESTING');

-- CreateTable
CREATE TABLE "DeveloperTask" (
    "id" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "category" "DevTaskCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeveloperTask_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DeveloperTask" ADD CONSTRAINT "DeveloperTask_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;
