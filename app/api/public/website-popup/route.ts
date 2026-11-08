import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export async function GET() {
  const now = new Date();
  const popup = await db.websitePopup.findFirst({
    where: { id: "school", enabled: true, startsAt: { lte: now }, endsAt: { gt: now } },
    select: { tagline: true, imageAlt: true, linkUrl: true, linkLabel: true, updatedAt: true },
  });
  return NextResponse.json(popup, { headers: { "Cache-Control": "no-store" } });
}
