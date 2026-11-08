import { Prisma, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { activeEnquiryRole } from "@/lib/enquiry-access";
import { socialLinkInput } from "@/lib/social-links";
import { publishSocial, WebsitePublishConflict } from "@/lib/website-publish";

const linksInput = z.array(socialLinkInput).length(3).refine((links) => new Set(links.map((link) => link.platform)).size === 3);

async function authorised() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== Role.SUPER_ADMIN || !(await activeEnquiryRole(session.user.id, session.user.role))) return null;
  return session.user;
}

export async function GET() {
  const user = await authorised();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await db.auditLog.create({ data: { actorId: user.id, action: "READ_SOCIAL_LINKS", entityType: "SocialLink", entityId: "school" } });
  const [draft, live] = await Promise.all([db.websiteSocialDraft.findUnique({ where: { id: "school" } }), db.socialLink.findMany()]);
  return NextResponse.json({ links: draft?.links ?? live, updatedAt: draft?.updatedAt ?? null }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PUT(request: Request) {
  const user = await authorised();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z.object({ links: linksInput, updatedAt: z.union([z.iso.datetime(), z.null()]) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter valid HTTPS URLs for the selected social platforms." }, { status: 400 });
  }
  const { links, updatedAt } = parsed.data;
  const saved = await db.$transaction(async (tx) => {
    if (updatedAt) {
      const result = await tx.websiteSocialDraft.updateMany({ where: { id: "school", updatedAt: new Date(updatedAt) }, data: { links } });
      if (!result.count) return false;
    } else {
      const live = await tx.socialLink.findMany();
      const baseline = links.map(({ platform }) => ({ platform, updatedAt: live.find((item) => item.platform === platform)?.updatedAt.toISOString() ?? null }));
      const result = await tx.websiteSocialDraft.createMany({ data: [{ id: "school", links, baseline }], skipDuplicates: true });
      if (!result.count) return false;
    }
    await tx.auditLog.create({ data: { actorId: user.id, action: "UPDATE_SOCIAL_LINKS_DRAFT", entityType: "SocialLink", entityId: "school" } });
    return true;
  });
  if (!saved) return NextResponse.json({ error: "Another editor changed this draft. Reload before saving." }, { status: 409 });
  return NextResponse.json({ success: true });
}

export async function POST(request: Request) {
  const user = await authorised();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z.object({ updatedAt: z.iso.datetime() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Reload the social draft before publishing." }, { status: 400 });
  const result = await db.$transaction(async (tx) => {
    const change = await publishSocial(tx, parsed.data.updatedAt);
    await tx.auditLog.create({ data: { actorId: user.id, action: "PUBLISH_SOCIAL_LINKS", entityType: "SocialLink", entityId: "school", ...change } });
    return true;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }).catch((error: unknown) => { if (error instanceof WebsitePublishConflict || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")) return false; throw error; });
  if (!result) return NextResponse.json({ error: "The draft or live social links changed. Review before publishing." }, { status: 409 });
  return NextResponse.json({ published: true });
}
