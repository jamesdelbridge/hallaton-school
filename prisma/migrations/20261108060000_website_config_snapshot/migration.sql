CREATE TABLE "WebsiteConfigSnapshot" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  CONSTRAINT "WebsiteConfigSnapshot_pkey" PRIMARY KEY ("id")
);
