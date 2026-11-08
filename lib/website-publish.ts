import { Prisma } from "@prisma/client";
import { z } from "zod";
import { socialLinkInput } from "@/lib/social-links";
import { customNavigationTargets } from "@/lib/website-navigation";
import { homeLayoutCustomTargets } from "@/lib/website-home-layout";
import { websitePages } from "@/lib/website-pages";
import { readDocuments } from "@/lib/website-documents";
import { formatWebsiteAudit } from "@/lib/website-audit";
import { readWebsiteCopy } from "@/lib/website-copy";
import { readWebsiteIdentity } from "@/lib/website-identity";
import { classPageLinks, isClassCardId, schoolPageId } from "@/lib/class-navigation";
import { readNavigation } from "@/lib/website-navigation";

export class WebsitePublishConflict extends Error {}

export async function publishPage(tx: Prisma.TransactionClient, pageId: string, version: string) {
  const previous = await tx.websitePagePublished.findUnique({ where: { pageId } });
  const locked = await tx.websitePageDraft.updateMany({ where: { pageId, updatedAt: new Date(version) }, data: { updatedAt: new Date() } });
  if (!locked.count) throw new WebsitePublishConflict();
  const draft = await tx.websitePageDraft.findUniqueOrThrow({ where: { pageId } });
  if (pageId === "navigation" || pageId === "related-navigation" || pageId === "home-layout") {
    const targets = pageId === "home-layout" ? homeLayoutCustomTargets(draft.body) : customNavigationTargets(draft.body, pageId === "related-navigation");
    if (targets.length && await tx.websitePagePublished.count({ where: { pageId: { in: targets } } }) !== targets.length) throw new WebsitePublishConflict();
  }
  if (draft.baseUpdatedAt) {
    const updated = await tx.websitePagePublished.updateMany({ where: { pageId, updatedAt: draft.baseUpdatedAt }, data: { title: draft.title, body: draft.body, documents: draft.documents } });
    if (!updated.count) throw new WebsitePublishConflict();
  } else {
    const created = await tx.websitePagePublished.createMany({ data: [{ pageId, title: draft.title, body: draft.body, documents: draft.documents }], skipDuplicates: true });
    if (!created.count) throw new WebsitePublishConflict();
  }
  const live = await tx.websitePagePublished.findUniqueOrThrow({ where: { pageId } });
  await tx.websitePageDraft.update({ where: { pageId }, data: { baseUpdatedAt: live.updatedAt } });
  let fallback = websitePages().find((page) => page.id === pageId);
  if (!previous && !fallback && isClassCardId(pageId)) {
    const navigation = await tx.websitePagePublished.findUnique({ where: { pageId: "navigation" }, select: { body: true } });
    const link = classPageLinks(readNavigation(navigation?.body)).find((item) => schoolPageId(item.href) === pageId.slice("class-card-".length));
    if (link) fallback = { id: pageId, title: link.label, body: "" };
  }
  const format = (page: { title: string; body: string; documents?: string | null } | undefined | null) => page
    ? `Title:\n${page.title}\n\nContent:\n${pageId === "home-copy" ? JSON.stringify(readWebsiteCopy(page.body), null, 2) : pageId === "site-identity" ? JSON.stringify(readWebsiteIdentity(page.body), null, 2) : page.body}\n\nDocuments:\n${readDocuments(page.documents, pageId).map((document) => `${document.title}\n${document.url}`).join("\n\n") || "(none)"}`
    : null;
  return { beforeText: format(previous ?? fallback), afterText: format(live) };
}

export async function publishPopup(tx: Prisma.TransactionClient, version: string) {
  const previous = await tx.websitePopup.findUnique({ where: { id: "school" } });
  const locked = await tx.websitePopup.updateMany({ where: { id: "draft", updatedAt: new Date(version) }, data: { updatedAt: new Date() } });
  if (!locked.count) throw new WebsitePublishConflict();
  const draft = await tx.websitePopup.findUniqueOrThrow({ where: { id: "draft" } });
  const { id: _id, updatedAt: _updatedAt, baseUpdatedAt, ...content } = draft;
  if (baseUpdatedAt) {
    const updated = await tx.websitePopup.updateMany({ where: { id: "school", updatedAt: baseUpdatedAt }, data: content });
    if (!updated.count) throw new WebsitePublishConflict();
  } else {
    const created = await tx.websitePopup.createMany({ data: [{ id: "school", ...content }], skipDuplicates: true });
    if (!created.count) throw new WebsitePublishConflict();
  }
  const live = await tx.websitePopup.findUniqueOrThrow({ where: { id: "school" }, select: { updatedAt: true } });
  await tx.websitePopup.update({ where: { id: "draft" }, data: { baseUpdatedAt: live.updatedAt } });
  const text = (value: typeof previous) => value ? formatWebsiteAudit({
    tagline: value.tagline, imageAlt: value.imageAlt, imageType: value.imageType, linkUrl: value.linkUrl,
    linkLabel: value.linkLabel, startsAt: value.startsAt, endsAt: value.endsAt, enabled: value.enabled,
  }) : null;
  const imageChanged = !previous || !Buffer.from(previous.image).equals(Buffer.from(draft.image));
  return { beforeText: text(previous), afterText: `${text(draft)}\nImage changed: ${imageChanged ? "yes" : "no"}` };
}

export async function publishSocial(tx: Prisma.TransactionClient, version: string) {
  const previous = await tx.socialLink.findMany({ select: { platform: true, url: true, enabled: true }, orderBy: { platform: "asc" } });
  const locked = await tx.websiteSocialDraft.updateMany({ where: { id: "school", updatedAt: new Date(version) }, data: { updatedAt: new Date() } });
  if (!locked.count) throw new WebsitePublishConflict();
  const draft = await tx.websiteSocialDraft.findUniqueOrThrow({ where: { id: "school" } });
  const links = z.array(socialLinkInput).length(3).refine((value) => new Set(value.map((item) => item.platform)).size === 3).parse(draft.links);
  const baseline = z.array(z.object({ platform: z.string(), updatedAt: z.iso.datetime().nullable() })).parse(draft.baseline);
  for (const link of links) {
    const old = baseline.find((item) => item.platform === link.platform);
    if (!old) throw new WebsitePublishConflict();
    if (old.updatedAt) {
      const updated = await tx.socialLink.updateMany({ where: { platform: link.platform, updatedAt: new Date(old.updatedAt) }, data: { url: link.url, enabled: link.enabled } });
      if (!updated.count) throw new WebsitePublishConflict();
    } else {
      const created = await tx.socialLink.createMany({ data: [link], skipDuplicates: true });
      if (!created.count) throw new WebsitePublishConflict();
    }
  }
  const live = await tx.socialLink.findMany();
  await tx.websiteSocialDraft.update({ where: { id: "school" }, data: { baseline: links.map(({ platform }) => ({ platform, updatedAt: live.find((item) => item.platform === platform)?.updatedAt.toISOString() ?? null })) } });
  return { beforeText: JSON.stringify(previous, null, 2), afterText: JSON.stringify(links, null, 2) };
}
