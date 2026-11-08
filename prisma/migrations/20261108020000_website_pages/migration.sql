CREATE TABLE "WebsitePageDraft" (
  "pageId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "baseUpdatedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebsitePageDraft_pkey" PRIMARY KEY ("pageId")
);
CREATE TABLE "WebsitePagePublished" (
  "pageId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebsitePagePublished_pkey" PRIMARY KEY ("pageId")
);
