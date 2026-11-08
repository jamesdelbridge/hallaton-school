import { NextResponse } from "next/server";
import { websitePreviewUser } from "@/lib/website-preview-auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await websitePreviewUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [announcements, newsletters, events] = await Promise.all([
    db.announcement.findMany({ select: { id: true, title: true, body: true, publishedAt: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 6 }),
    db.newsletter.findMany({ select: { id: true, title: true, issueDate: true, publicUrl: true }, orderBy: { issueDate: "desc" }, take: 12 }),
    db.schoolEvent.findMany({ where: { publicTitle: { not: null }, publicSummary: { not: null }, startsAt: { gte: new Date() } }, select: { id: true, publicTitle: true, publicSummary: true, startsAt: true, endsAt: true }, orderBy: { startsAt: "asc" }, take: 6 }),
  ]);
  await db.auditLog.create({ data: { actorId: user.id, action: "VIEW_WEBSITE_UPDATES_DRAFT", entityType: "SchoolContent", entityId: "list" } });
  return NextResponse.json({
    announcements: announcements.map(({ createdAt, ...item }) => ({ ...item, publishedAt: item.publishedAt ?? createdAt })),
    newsletters,
    events: events.map(({ publicTitle, publicSummary, ...item }) => ({ ...item, title: publicTitle, description: publicSummary })),
  }, { headers: { "Cache-Control": "private, no-store" } });
}
