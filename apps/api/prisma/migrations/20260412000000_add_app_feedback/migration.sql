CREATE TABLE "AppFeedback" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "routePath" TEXT NOT NULL,
    "pageTitle" TEXT,
    "contextLabel" TEXT,
    "originalName" TEXT,
    "storageKey" TEXT,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppFeedback_pkey" PRIMARY KEY ("id")
);
