import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readWebsiteIdentity } from "@/lib/website-identity";

export async function GET() {
  const live = await db.websitePagePublished.findUnique({ where: { pageId: "site-identity" }, select: { body: true } });
  return NextResponse.json(readWebsiteIdentity(live?.body), { headers: { "Cache-Control": "no-store" } });
}
