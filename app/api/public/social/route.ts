import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { socialLinkInput } from "@/lib/social-links";

export async function GET() {
  const links = await db.socialLink.findMany({ where: { enabled: true }, select: { platform: true, url: true, enabled: true } });
  return NextResponse.json(links.filter((link) => socialLinkInput.safeParse(link).success), { headers: { "Cache-Control": "no-store" } });
}
