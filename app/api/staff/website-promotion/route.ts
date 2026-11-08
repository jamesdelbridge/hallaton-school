import { Role, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { activeEnquiryRole } from "@/lib/enquiry-access";
import { db } from "@/lib/db";
import { websitePages } from "@/lib/website-pages";
import { isCustomPageId } from "@/lib/website-custom-page";
import { publishPage, publishPopup, publishSocial, WebsitePublishConflict } from "@/lib/website-publish";
import { createHash } from "node:crypto";
import { formatWebsiteAudit } from "@/lib/website-audit";
import { isClassCardId } from "@/lib/class-navigation";

function version(values: unknown[]) {
  return createHash("sha256").update(JSON.stringify(values)).digest("hex");
}

async function admin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== Role.SUPER_ADMIN || !(await activeEnquiryRole(session.user.id, session.user.role))) return null;
  return session.user;
}

export async function GET() {
  const user = await admin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [pages, popup, social, announcements, newsletters, events] = await Promise.all([
    db.websitePageDraft.findMany({ select: { pageId: true, title: true, updatedAt: true }, orderBy: { pageId: "asc" } }),
    db.websitePopup.findUnique({ where: { id: "draft" }, select: { tagline: true, enabled: true, startsAt: true, endsAt: true, updatedAt: true } }),
    db.websiteSocialDraft.findUnique({ where: { id: "school" }, select: { updatedAt: true } }),
    db.announcement.findMany({ where: { publishedAt: null }, select: { id: true, title: true, body: true }, orderBy: { createdAt: "desc" } }),
    db.newsletter.findMany({ where: { publishedAt: null }, select: { id: true, title: true, issueDate: true, publicUrl: true }, orderBy: { issueDate: "desc" } }),
    db.schoolEvent.findMany({ where: { approved: true, published: false, publicTitle: { not: null }, publicSummary: { not: null } }, select: { id: true, publicTitle: true, publicSummary: true, startsAt: true, endsAt: true }, orderBy: { startsAt: "asc" } }),
  ]);
  await db.auditLog.create({ data: { actorId: user.id, action: "READ_WEBSITE_PROMOTION", entityType: "Website", entityId: "school" } });
  return NextResponse.json({ pages, popup, social,
    announcements: announcements.map((item) => ({ id: item.id, title: item.title, version: version([item.title, item.body]) })),
    newsletters: newsletters.map((item) => ({ id: item.id, title: item.title, version: version([item.title, item.issueDate, item.publicUrl]) })),
    events: events.filter((item) => (item.publicTitle?.trim().length ?? 0) >= 3 && (item.publicSummary?.trim().length ?? 0) >= 5).map((item) => ({ id: item.id, title: item.publicTitle, summary: item.publicSummary, startsAt: item.startsAt, version: version([item.publicTitle, item.publicSummary, item.startsAt, item.endsAt]) })),
  }, { headers: { "Cache-Control": "private, no-store" } });
}

const items = z.array(z.object({ id: z.string().min(1).max(100), version: z.string().regex(/^[a-f0-9]{64}$/) })).max(500).refine((value) => new Set(value.map((item) => item.id)).size === value.length);
const selection = z.object({
  pages: z.array(z.object({ pageId: z.string().min(1).max(61), updatedAt: z.iso.datetime() })).max(200),
  popup: z.iso.datetime().nullable(),
  social: z.iso.datetime().nullable(),
  announcements: items.default([]),
  newsletters: items.default([]),
  events: items.default([]),
}).refine((value) => new Set(value.pages.map((page) => page.pageId)).size === value.pages.length);

export async function POST(request: Request) {
  const user = await admin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = selection.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.pages.some((page) => !isCustomPageId(page.pageId) && !isClassCardId(page.pageId) && !websitePages().some((known) => known.id === page.pageId)) || (!parsed.data.pages.length && !parsed.data.popup && !parsed.data.social && !parsed.data.announcements.length && !parsed.data.newsletters.length && !parsed.data.events.length)) {
    return NextResponse.json({ error: "Select at least one valid saved draft." }, { status: 400 });
  }
  try {
    await db.$transaction(async (tx) => {
      for (const page of [...parsed.data.pages].sort((a, b) => Number(["navigation", "related-navigation", "home-layout"].includes(a.pageId)) - Number(["navigation", "related-navigation", "home-layout"].includes(b.pageId)) || a.pageId.localeCompare(b.pageId))) {
        const change = await publishPage(tx, page.pageId, page.updatedAt);
        await tx.auditLog.create({ data: { actorId: user.id, action: "PUBLISH_WEBSITE_PAGE", entityType: "WebsitePage", entityId: page.pageId, ...change } });
      }
      if (parsed.data.popup) {
        const change = await publishPopup(tx, parsed.data.popup);
        await tx.auditLog.create({ data: { actorId: user.id, action: "PUBLISH_WEBSITE_POPUP", entityType: "WebsitePopup", entityId: "school", ...change } });
      }
      if (parsed.data.social) {
        const change = await publishSocial(tx, parsed.data.social);
        await tx.auditLog.create({ data: { actorId: user.id, action: "PUBLISH_SOCIAL_LINKS", entityType: "SocialLink", entityId: "school", ...change } });
      }
      for (const item of [...parsed.data.announcements].sort((a, b) => a.id.localeCompare(b.id))) {
        const row = await tx.announcement.findUnique({ where: { id: item.id } });
        if (!row || row.publishedAt || version([row.title, row.body]) !== item.version) throw new WebsitePublishConflict();
        const updated = await tx.announcement.updateMany({ where: { id: row.id, publishedAt: null, title: row.title, body: row.body }, data: { publishedAt: new Date() } });
        if (!updated.count) throw new WebsitePublishConflict();
        await tx.auditLog.create({ data: { actorId: user.id, action: "PUBLISH", entityType: "Announcement", entityId: row.id, afterText: formatWebsiteAudit({ title: row.title, body: row.body }) } });
      }
      for (const item of [...parsed.data.newsletters].sort((a, b) => a.id.localeCompare(b.id))) {
        const row = await tx.newsletter.findUnique({ where: { id: item.id } });
        if (!row || row.publishedAt || version([row.title, row.issueDate, row.publicUrl]) !== item.version) throw new WebsitePublishConflict();
        const updated = await tx.newsletter.updateMany({ where: { id: row.id, publishedAt: null, title: row.title, issueDate: row.issueDate, publicUrl: row.publicUrl }, data: { publishedAt: new Date() } });
        if (!updated.count) throw new WebsitePublishConflict();
        await tx.auditLog.create({ data: { actorId: user.id, action: "PUBLISH", entityType: "Newsletter", entityId: row.id, afterText: formatWebsiteAudit({ title: row.title, issueDate: row.issueDate, publicUrl: row.publicUrl }) } });
      }
      for (const item of [...parsed.data.events].sort((a, b) => a.id.localeCompare(b.id))) {
        const row = await tx.schoolEvent.findUnique({ where: { id: item.id }, select: { id: true, published: true, publicTitle: true, publicSummary: true, startsAt: true, endsAt: true } });
        if (!row || row.published || (row.publicTitle?.trim().length ?? 0) < 3 || (row.publicSummary?.trim().length ?? 0) < 5 || version([row.publicTitle, row.publicSummary, row.startsAt, row.endsAt]) !== item.version) throw new WebsitePublishConflict();
        const updated = await tx.schoolEvent.updateMany({ where: { id: row.id, approved: true, published: false, publicTitle: row.publicTitle, publicSummary: row.publicSummary, startsAt: row.startsAt, endsAt: row.endsAt }, data: { published: true } });
        if (!updated.count) throw new WebsitePublishConflict();
        const students = await tx.eventInvite.findMany({ where: { eventId: row.id }, distinct: ["studentId"], select: { studentId: true } });
        await tx.auditLog.create({ data: { actorId: user.id, action: "PUBLISH", entityType: "SchoolEvent", entityId: row.id, afterText: formatWebsiteAudit({ title: row.publicTitle, summary: row.publicSummary, startsAt: row.startsAt, endsAt: row.endsAt }), students: { create: students } } });
      }
      await tx.auditLog.create({ data: { actorId: user.id, action: "PROMOTE_WEBSITE_DRAFT", entityType: "Website", entityId: "school" } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof WebsitePublishConflict || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")) {
      return NextResponse.json({ error: "A selected draft or its live content changed, or a linked custom page is not published or selected. Nothing was published; reload and review before trying again." }, { status: 409 });
    }
    throw error;
  }
  return NextResponse.json({ published: true });
}
