import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export async function GET() {
  const now = new Date();
  const popup = await db.websitePopup.findFirst({ where: { id: "school", enabled: true, startsAt: { lte: now }, endsAt: { gt: now } }, select: { image: true, imageType: true } });
  if (!popup) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return new NextResponse(new Uint8Array(popup.image), { headers: { "Content-Type": popup.imageType, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
