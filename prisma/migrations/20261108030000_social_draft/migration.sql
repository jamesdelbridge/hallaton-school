CREATE TABLE "WebsiteSocialDraft" (
  "id" TEXT NOT NULL,
  "links" JSONB NOT NULL,
  "baseline" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebsiteSocialDraft_pkey" PRIMARY KEY ("id")
);
