import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const [announcements, newsletters, events] = await Promise.all([
    db.announcement.findMany({
      where: { publishedAt: { not: null } },
      select: { id: true, title: true, body: true, publishedAt: true },
      orderBy: { publishedAt: "desc" },
      take: 6,
    }),
    db.newsletter.findMany({
      where: { publishedAt: { not: null } },
      select: { id: true, title: true, issueDate: true, publicUrl: true },
      orderBy: { issueDate: "desc" },
      take: 12,
    }),
    db.schoolEvent.findMany({
      where: { published: true, publicTitle: { not: null }, publicSummary: { not: null }, startsAt: { gte: new Date() } },
      select: { id: true, publicTitle: true, publicSummary: true, startsAt: true, endsAt: true },
      orderBy: { startsAt: "asc" },
      take: 6,
    }),
  ]);
  return NextResponse.json({ announcements, newsletters, events: events.map(({ publicTitle, publicSummary, ...event }) => ({ ...event, title: publicTitle, description: publicSummary })) });
}
