import { Prisma } from "@prisma/client";
import { z } from "zod";

const snapshotSchema = z.object({
  version: z.union([z.literal(1), z.literal(2)]),
  pages: z.array(z.object({ pageId: z.string(), title: z.string(), body: z.string(), documents: z.string().nullable() })),
  social: z.array(z.object({ platform: z.string(), url: z.string(), enabled: z.boolean() })),
  popup: z.object({
    tagline: z.string(), imageAlt: z.string(), image: z.base64(), imageType: z.string(),
    linkUrl: z.string(), linkLabel: z.string(), startsAt: z.iso.datetime(), endsAt: z.iso.datetime(), enabled: z.boolean(),
  }).nullable(),
  announcements: z.array(z.object({ id: z.string(), title: z.string(), body: z.string(), publishedAt: z.iso.datetime() })).optional(),
  newsletters: z.array(z.object({ id: z.string(), title: z.string(), issueDate: z.iso.datetime(), publicUrl: z.string().nullable(), publishedAt: z.iso.datetime() })).optional(),
  events: z.array(z.object({ id: z.string(), publicTitle: z.string().nullable(), publicSummary: z.string().nullable(), startsAt: z.iso.datetime(), endsAt: z.iso.datetime().nullable() })).optional(),
}).superRefine((value, ctx) => {
  if (value.version === 2 && (!value.announcements || !value.newsletters || !value.events)) {
    ctx.addIssue({ code: "custom", message: "Incomplete website snapshot" });
  }
});

export class WebsiteSnapshotConflict extends Error {}

export async function snapshotWebsiteConfig(tx: Prisma.TransactionClient, actorId: string, reason: string) {
  const [pages, social, popup, announcements, newsletters, events] = await Promise.all([
    tx.websitePagePublished.findMany({ select: { pageId: true, title: true, body: true, documents: true } }),
    tx.socialLink.findMany({ select: { platform: true, url: true, enabled: true } }),
    tx.websitePopup.findUnique({ where: { id: "school" } }),
    tx.announcement.findMany({ where: { publishedAt: { not: null } }, select: { id: true, title: true, body: true, publishedAt: true } }),
    tx.newsletter.findMany({ where: { publishedAt: { not: null } }, select: { id: true, title: true, issueDate: true, publicUrl: true, publishedAt: true } }),
    tx.schoolEvent.findMany({ where: { published: true }, select: { id: true, publicTitle: true, publicSummary: true, startsAt: true, endsAt: true } }),
  ]);
  const content = {
    version: 2 as const, pages, social,
    announcements: announcements.map((item) => ({ ...item, publishedAt: item.publishedAt!.toISOString() })),
    newsletters: newsletters.map((item) => ({ ...item, issueDate: item.issueDate.toISOString(), publishedAt: item.publishedAt!.toISOString() })),
    events: events.map((item) => ({ ...item, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt?.toISOString() ?? null })),
    popup: popup && {
      tagline: popup.tagline, imageAlt: popup.imageAlt, image: Buffer.from(popup.image).toString("base64"),
      imageType: popup.imageType, linkUrl: popup.linkUrl, linkLabel: popup.linkLabel,
      startsAt: popup.startsAt.toISOString(), endsAt: popup.endsAt.toISOString(), enabled: popup.enabled,
    },
  };
  const snapshot = await tx.websiteConfigSnapshot.create({ data: { actorId, reason, content } });
  await tx.auditLog.create({ data: { actorId, action: "SNAPSHOT_WEBSITE_CONFIG", entityType: "WebsiteConfigSnapshot", entityId: snapshot.id } });
}

export async function restoreWebsiteConfig(tx: Prisma.TransactionClient, content: Prisma.JsonValue) {
  const snapshot = snapshotSchema.parse(content);
  if (snapshot.version === 2) {
    const announcements = snapshot.announcements!;
    const newsletters = snapshot.newsletters!;
    const events = snapshot.events!;
    for (const item of announcements) {
      const current = await tx.announcement.findUnique({ where: { id: item.id } });
      if (!current || current.title !== item.title || current.body !== item.body) throw new WebsiteSnapshotConflict("A snapshotted announcement was removed or changed.");
    }
    for (const item of newsletters) {
      const current = await tx.newsletter.findUnique({ where: { id: item.id } });
      if (!current || current.title !== item.title || current.publicUrl !== item.publicUrl || current.issueDate.toISOString() !== item.issueDate) throw new WebsiteSnapshotConflict("A snapshotted newsletter was removed or changed.");
    }
    for (const item of events) {
      const current = await tx.schoolEvent.findUnique({ where: { id: item.id }, select: { startsAt: true, endsAt: true, published: true, publicTitle: true, publicSummary: true } });
      if (!current || current.startsAt.toISOString() !== item.startsAt || (current.endsAt?.toISOString() ?? null) !== item.endsAt) throw new WebsiteSnapshotConflict("A snapshotted event was removed or its dates changed.");
      if (!current.published || current.publicTitle !== item.publicTitle || current.publicSummary !== item.publicSummary) throw new WebsiteSnapshotConflict("A previously public event was withdrawn or changed. Review it separately; restoring it automatically could expose sensitive information.");
    }
    await tx.announcement.updateMany({ where: { publishedAt: { not: null }, id: { notIn: announcements.map((item) => item.id) } }, data: { publishedAt: null } });
    for (const item of announcements) await tx.announcement.update({ where: { id: item.id }, data: { publishedAt: new Date(item.publishedAt) } });
    await tx.newsletter.updateMany({ where: { publishedAt: { not: null }, id: { notIn: newsletters.map((item) => item.id) } }, data: { publishedAt: null } });
    for (const item of newsletters) await tx.newsletter.update({ where: { id: item.id }, data: { publishedAt: new Date(item.publishedAt) } });
    await tx.schoolEvent.updateMany({ where: { published: true, id: { notIn: events.map((item) => item.id) } }, data: { published: false } });
  }
  await tx.websitePagePublished.deleteMany();
  if (snapshot.pages.length) await tx.websitePagePublished.createMany({ data: snapshot.pages });
  await tx.socialLink.deleteMany();
  if (snapshot.social.length) await tx.socialLink.createMany({ data: snapshot.social });
  await tx.websitePopup.deleteMany({ where: { id: "school" } });
  if (snapshot.popup) {
    const { image, startsAt, endsAt, ...rest } = snapshot.popup;
    await tx.websitePopup.create({ data: { id: "school", ...rest, image: Buffer.from(image, "base64"), startsAt: new Date(startsAt), endsAt: new Date(endsAt) } });
  }
}
