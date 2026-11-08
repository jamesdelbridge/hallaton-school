ALTER TABLE "WebsitePopup" ADD COLUMN "baseUpdatedAt" TIMESTAMP(3);
UPDATE "WebsitePopup" AS draft
SET "baseUpdatedAt" = live."updatedAt"
FROM "WebsitePopup" AS live
WHERE draft."id" = 'draft' AND live."id" = 'school';
