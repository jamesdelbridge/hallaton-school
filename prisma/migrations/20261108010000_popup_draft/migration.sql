INSERT INTO "WebsitePopup" ("id", "tagline", "imageAlt", "image", "imageType", "linkUrl", "linkLabel", "startsAt", "endsAt", "enabled", "updatedAt")
SELECT 'draft', "tagline", "imageAlt", "image", "imageType", "linkUrl", "linkLabel", "startsAt", "endsAt", "enabled", "updatedAt"
FROM "WebsitePopup" WHERE "id" = 'school'
ON CONFLICT ("id") DO NOTHING;
