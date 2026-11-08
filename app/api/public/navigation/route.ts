import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readNavigation } from "@/lib/website-navigation";

export async function GET() {
  const live = await db.websitePagePublished.findUnique({ where: { pageId: "navigation" }, select: { body: true } });
  return NextResponse.json(readNavigation(live?.body), { headers: { "Cache-Control": "no-store" } });
}
