import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { websitePreviewUser } from "@/lib/website-preview-auth";
import { readWebsiteIdentity } from "@/lib/website-identity";

export async function GET() {
  const user = await websitePreviewUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [draft, live] = await Promise.all([
    db.websitePageDraft.findUnique({ where: { pageId: "site-identity" }, select: { body: true } }),
    db.websitePagePublished.findUnique({ where: { pageId: "site-identity" }, select: { body: true } }),
  ]);
  await db.auditLog.create({ data: { actorId: user.id, action: "VIEW_WEBSITE_PAGE_DRAFT", entityType: "WebsitePage", entityId: "site-identity" } });
  return NextResponse.json(readWebsiteIdentity(draft?.body ?? live?.body), { headers: { "Cache-Control": "private, no-store" } });
}
