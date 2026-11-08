import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readNavigation } from "@/lib/website-navigation";
import { websitePreviewUser } from "@/lib/website-preview-auth";

export async function GET() {
  const user = await websitePreviewUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [draft, live] = await Promise.all([
    db.websitePageDraft.findUnique({ where: { pageId: "navigation" }, select: { body: true } }),
    db.websitePagePublished.findUnique({ where: { pageId: "navigation" }, select: { body: true } }),
  ]);
  await db.auditLog.create({ data: { actorId: user.id, action: "VIEW_WEBSITE_PAGE_DRAFT", entityType: "WebsitePage", entityId: "navigation" } });
  return NextResponse.json(readNavigation(draft?.body ?? live?.body), { headers: { "Cache-Control": "private, no-store" } });
}
