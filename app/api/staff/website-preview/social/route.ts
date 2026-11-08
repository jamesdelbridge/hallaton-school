import { NextResponse } from "next/server";
import { websitePreviewUser } from "@/lib/website-preview-auth";
import { db } from "@/lib/db";
import { socialLinkInput } from "@/lib/social-links";
import { z } from "zod";

export async function GET() {
  const user = await websitePreviewUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [draft, live] = await Promise.all([db.websiteSocialDraft.findUnique({ where: { id: "school" } }), db.socialLink.findMany()]);
  const links = z.array(socialLinkInput).parse(draft?.links ?? live);
  await db.auditLog.create({ data: { actorId: user.id, action: "VIEW_SOCIAL_LINKS_DRAFT", entityType: "SocialLink", entityId: "school" } });
  return NextResponse.json(links.filter((link) => link.enabled), { headers: { "Cache-Control": "private, no-store" } });
}
