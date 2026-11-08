import { Prisma, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { activeEnquiryRole } from "@/lib/enquiry-access";
import { canManageSchoolContent } from "@/lib/permissions";
import { websitePages } from "@/lib/website-pages";
import { isCustomPageId } from "@/lib/website-custom-page";
import { publishPage, WebsitePublishConflict } from "@/lib/website-publish";
import { documentList, readDocuments } from "@/lib/website-documents";
import { customNavigationTargets, navigationInput } from "@/lib/website-navigation";
import { validStatutoryLink } from "@/lib/statutory-links";
import { websiteIdentityInput } from "@/lib/website-identity";
import { websiteCopyInput } from "@/lib/website-copy";
import { homeLayoutCustomTargets, homeLayoutInput } from "@/lib/website-home-layout";
import { contactCopyInput } from "@/lib/contact-copy";
import { classPageLinks, isClassCardId, schoolPageId } from "@/lib/class-navigation";
import { readNavigation } from "@/lib/website-navigation";
import { relatedNavigationInput } from "@/lib/website-related-navigation";

async function authorised() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canManageSchoolContent(session.user.role) || !(await activeEnquiryRole(session.user.id, session.user.role))) return null;
  return session.user;
}

export async function GET() {
  const user = await authorised();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [drafts, published] = await Promise.all([db.websitePageDraft.findMany(), db.websitePagePublished.findMany()]);
  const known = websitePages();
  const customIds = [...new Set([...drafts, ...published].map((item) => item.pageId).filter(isCustomPageId))];
  const classIds = [
    ...[drafts.find((row) => row.pageId === "navigation"), published.find((row) => row.pageId === "navigation")].flatMap((row) =>
      classPageLinks(readNavigation(row?.body)).map((item) => ({ id: schoolPageId(item.href), label: item.label }))
    ).filter((item): item is { id: string; label: string } => item.id !== null && isClassCardId(`class-card-${item.id}`))
      .map(({ id, label }) => ({ id: `class-card-${id}`, title: label, body: "" })),
    ...[...drafts, ...published].filter((row) => isClassCardId(row.pageId)).map((row) => ({ id: row.pageId, title: row.title, body: row.body })),
  ];
  const extraCards = classIds.filter((card) => !known.some((item) => item.id === card.id)).filter((card, index, cards) => cards.findIndex((item) => item.id === card.id) === index);
  const pages = [...known, ...extraCards, ...customIds.map((id) => {
    const item = drafts.find((row) => row.pageId === id) ?? published.find((row) => row.pageId === id);
    return { id, title: item?.title ?? id, body: item?.body ?? "" };
  })].map((page) => {
    const live = published.find((item) => item.pageId === page.id);
    const draft = drafts.find((item) => item.pageId === page.id);
    return { id: page.id, title: draft?.title ?? live?.title ?? page.title, body: draft?.body ?? live?.body ?? page.body, documents: readDocuments(draft?.documents ?? live?.documents, page.id), updatedAt: draft?.updatedAt ?? null };
  });
  await db.auditLog.create({ data: { actorId: user.id, action: "READ_WEBSITE_PAGES", entityType: "WebsitePage", entityId: "list" } });
  return NextResponse.json(pages, { headers: { "Cache-Control": "private, no-store" } });
}

const pageInput = z.object({
  pageId: z.string().min(1).max(61),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().max(30000),
  updatedAt: z.union([z.iso.datetime(), z.null()]),
  documents: documentList.optional(),
  create: z.boolean().optional(),
});

export async function PUT(request: Request) {
  const user = await authorised();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = pageInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success || (!isCustomPageId(parsed.data.pageId) && !isClassCardId(parsed.data.pageId) && !websitePages().some((page) => page.id === parsed.data.pageId))) return NextResponse.json({ error: "Invalid page details." }, { status: 400 });
  const { pageId, title, body, updatedAt, documents, create } = parsed.data;
  if (isClassCardId(pageId) && !websitePages().some((page) => page.id === pageId)) {
    const target = pageId.slice("class-card-".length);
    if (!websitePages().some((page) => page.id === target) && !(await db.websitePageDraft.findUnique({ where: { pageId: target } })) && !(await db.websitePagePublished.findUnique({ where: { pageId: target } }))) {
      return NextResponse.json({ error: "Create the class page before its card." }, { status: 400 });
    }
  }
  if (create && (!isCustomPageId(pageId) || updatedAt !== null)) return NextResponse.json({ error: "Invalid new page." }, { status: 400 });
  if (pageId.startsWith("home-report-") && !validStatutoryLink(body)) return NextResponse.json({ error: "Enter a valid HTTPS report link, or leave it empty." }, { status: 400 });
  if (["home-image", "home-news-image", "home-church-image"].includes(pageId) && body) {
    try {
      const url = new URL(body);
      if (body.length > 2048 || url.protocol !== "https:" || url.username || url.password) throw new Error("Invalid URL");
    } catch { return NextResponse.json({ error: "Enter a valid HTTPS image URL, or leave it empty." }, { status: 400 }); }
  }
  if (pageId === "site-identity") {
    try { websiteIdentityInput.parse(JSON.parse(body)); } catch {
      return NextResponse.json({ error: "Invalid website identity or contact details." }, { status: 400 });
    }
  }
  if (pageId === "home-copy") {
    try { websiteCopyInput.parse(JSON.parse(body)); } catch {
      return NextResponse.json({ error: "Invalid homepage labels." }, { status: 400 });
    }
  }
  if (pageId === "contact-copy") {
    try { contactCopyInput.parse(JSON.parse(body)); } catch {
      return NextResponse.json({ error: "Invalid contact form labels or notices." }, { status: 400 });
    }
  }
  if (pageId === "home-layout") {
    try { homeLayoutInput.parse(JSON.parse(body)); } catch {
      return NextResponse.json({ error: "Invalid homepage links or visibility." }, { status: 400 });
    }
    const targets = homeLayoutCustomTargets(body);
    if (targets.length) {
      const [draftTargets, liveTargets] = await Promise.all([
        db.websitePageDraft.findMany({ where: { pageId: { in: targets } }, select: { pageId: true } }),
        db.websitePagePublished.findMany({ where: { pageId: { in: targets } }, select: { pageId: true } }),
      ]);
      if (new Set([...draftTargets, ...liveTargets].map((item) => item.pageId)).size !== targets.length) return NextResponse.json({ error: "Create each custom page draft before linking to it." }, { status: 400 });
    }
  }
  if (pageId === "navigation" || pageId === "related-navigation") {
    try { (pageId === "navigation" ? navigationInput : relatedNavigationInput).parse(JSON.parse(body)); } catch {
      return NextResponse.json({ error: "Invalid navigation. Use local school links and unique menu names; related-link sections must each identify a different school page." }, { status: 400 });
    }
    const targets = customNavigationTargets(body, pageId === "related-navigation");
    if (targets.length) {
      const [draftTargets, liveTargets] = await Promise.all([
        db.websitePageDraft.findMany({ where: { pageId: { in: targets } }, select: { pageId: true } }),
        db.websitePagePublished.findMany({ where: { pageId: { in: targets } }, select: { pageId: true } }),
      ]);
      if (new Set([...draftTargets, ...liveTargets].map((item) => item.pageId)).size !== targets.length) return NextResponse.json({ error: "Create each custom page draft before linking to it." }, { status: 400 });
    }
  }
  if (pageId.startsWith("class-card-")) {
    try {
      const url = new URL(body);
      if (body.length > 2048 || url.protocol !== "https:" || url.username || url.password) throw new Error("Invalid URL");
    } catch { return NextResponse.json({ error: "Enter an HTTPS image URL for the class card." }, { status: 400 }); }
  }
  if ((pageId.startsWith("class-card-") || pageId === "site-identity" || pageId === "navigation" || pageId === "related-navigation" || pageId === "contact" || pageId === "contact-copy" || pageId === "home" || pageId.startsWith("home-") || pageId === "102") && documents?.length) return NextResponse.json({ error: "This page does not support document links." }, { status: 400 });
  const result = await db.$transaction(async (tx) => {
    if (updatedAt) {
      const update = await tx.websitePageDraft.updateMany({ where: { pageId, updatedAt: new Date(updatedAt) }, data: { title, body, ...(documents !== undefined ? { documents: JSON.stringify(documents) } : {}) } });
      if (!update.count) return false;
    } else {
      const live = await tx.websitePagePublished.findUnique({ where: { pageId }, select: { updatedAt: true, documents: true } });
      if (create && live) return false;
      const created = await tx.websitePageDraft.createMany({ data: [{ pageId, title, body, documents: documents !== undefined ? JSON.stringify(documents) : live?.documents ?? null, baseUpdatedAt: live?.updatedAt ?? null }], skipDuplicates: true });
      if (!created.count) return false;
    }
    await tx.auditLog.create({ data: { actorId: user.id, action: "SAVE_WEBSITE_PAGE_DRAFT", entityType: "WebsitePage", entityId: pageId } });
    return true;
  });
  if (!result) return NextResponse.json({ error: "Another editor changed this draft. Reload before saving." }, { status: 409 });
  return NextResponse.json({ saved: true });
}

export async function POST(request: Request) {
  const user = await authorised();
  if (!user || user.role !== Role.SUPER_ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z.object({ pageId: z.string().min(1), updatedAt: z.iso.datetime() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success || (!isCustomPageId(parsed.data.pageId) && !isClassCardId(parsed.data.pageId) && !websitePages().some((page) => page.id === parsed.data.pageId))) return NextResponse.json({ error: "Invalid page draft." }, { status: 400 });
  const { pageId, updatedAt } = parsed.data;
  const result = await db.$transaction(async (tx) => {
    const change = await publishPage(tx, pageId, updatedAt);
    await tx.auditLog.create({ data: { actorId: user.id, action: "PUBLISH_WEBSITE_PAGE", entityType: "WebsitePage", entityId: pageId, ...change } });
    return true;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }).catch((error: unknown) => {
    if (error instanceof WebsitePublishConflict || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")) return false;
    throw error;
  });
  if (!result) return NextResponse.json({ error: "The draft or live page changed, or a linked custom page is not published. Publish linked pages first and review the current content." }, { status: 409 });
  return NextResponse.json({ published: true });
}
