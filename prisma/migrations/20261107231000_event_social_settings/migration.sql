ALTER TABLE "SchoolEvent" ADD COLUMN "publicTitle" TEXT, ADD COLUMN "publicSummary" TEXT;
UPDATE "SchoolEvent" SET "publicTitle" = "title", "publicSummary" = "description" WHERE "published" = true;
CREATE TABLE "SocialLink" (
  "platform" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SocialLink_pkey" PRIMARY KEY ("platform")
);
