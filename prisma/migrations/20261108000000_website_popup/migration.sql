CREATE TABLE "WebsitePopup" (
  "id" TEXT NOT NULL,
  "tagline" TEXT NOT NULL,
  "imageAlt" TEXT NOT NULL,
  "image" BYTEA NOT NULL,
  "imageType" TEXT NOT NULL,
  "linkUrl" TEXT NOT NULL,
  "linkLabel" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebsitePopup_pkey" PRIMARY KEY ("id")
);
