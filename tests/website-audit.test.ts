import assert from "node:assert/strict";
import test from "node:test";
import { loadEnvConfig } from "@next/env";

test("website publication captures defaults and new text without popup image bytes", { skip: process.env.RUN_DEMO_DB_TESTS !== "1" }, async () => {
  loadEnvConfig(process.cwd());
  assert.equal(new URL(process.env.DATABASE_URL ?? "").pathname, "/hallaton_copilot_demo", "Refusing to run against a non-demo database");
  const { PrismaClient, Prisma } = await import("@prisma/client");
  const { publishPage, publishPopup } = await import("../lib/website-publish");
  const { websitePages } = await import("../lib/website-pages");
  const { defaultDocuments } = await import("../lib/website-documents");
  const db = new PrismaClient();
  const rollback = new Error("Intentional rollback");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const pageId = "102";
      await tx.websitePageDraft.deleteMany({ where: { pageId } });
      await tx.websitePagePublished.deleteMany({ where: { pageId } });
      const draft = await tx.websitePageDraft.create({ data: { pageId, title: "New title", body: "New text", documents: "[]" } });
      const page = await publishPage(tx, pageId, draft.updatedAt.toISOString());
      assert.ok(page.beforeText?.includes(websitePages().find((item) => item.id === pageId)!.title));
      assert.ok(page.beforeText?.includes(websitePages().find((item) => item.id === pageId)!.body));
      for (const document of defaultDocuments(pageId)) {
        assert.ok(page.beforeText?.includes(document.title));
        assert.ok(page.beforeText?.includes(document.url));
      }
      assert.equal(page.afterText, "Title:\nNew title\n\nContent:\nNew text\n\nDocuments:\n(none)");

      await tx.websitePopup.deleteMany({ where: { id: { in: ["school", "draft"] } } });
      const popup = await tx.websitePopup.create({ data: {
        id: "draft", tagline: "Public tagline", imageAlt: "Match", image: Buffer.from("SECRET-IMAGE-BYTES"),
        imageType: "image/png", linkUrl: "https://example.test", linkLabel: "Report",
        startsAt: new Date("2099-01-01T00:00:00Z"), endsAt: new Date("2099-01-02T00:00:00Z"),
      } });
      const change = await publishPopup(tx, popup.updatedAt.toISOString());
      assert.equal(change.beforeText, null);
      assert.match(change.afterText, /Public tagline/);
      assert.match(change.afterText, /Image changed: yes/);
      assert.doesNotMatch(change.afterText, /SECRET-IMAGE-BYTES/);
      throw rollback;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }), (error) => error === rollback);
  } finally { await db.$disconnect(); }
});

test("related links publish atomically only after custom destinations and preserve the previous defaults", { skip: process.env.RUN_DEMO_DB_TESTS !== "1" }, async () => {
  loadEnvConfig(process.cwd());
  assert.equal(new URL(process.env.DATABASE_URL ?? "").pathname, "/hallaton_copilot_demo", "Refusing to run against a non-demo database");
  const { PrismaClient, Prisma } = await import("@prisma/client");
  const { publishPage, WebsitePublishConflict } = await import("../lib/website-publish");
  const { defaultRelatedNavigation } = await import("../lib/website-related-navigation");
  const db = new PrismaClient();
  const rollback = new Error("Intentional rollback");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const target = "custom-related-audit-test";
      await tx.websitePageDraft.deleteMany({ where: { pageId: { in: ["related-navigation", target] } } });
      await tx.websitePagePublished.deleteMany({ where: { pageId: { in: ["related-navigation", target] } } });
      const page = await tx.websitePageDraft.create({ data: { pageId: target, title: "Test", body: "Test page" } });
      const links = await tx.websitePageDraft.create({ data: { pageId: "related-navigation", title: "Related", body: JSON.stringify([{ label: "News", href: "/page?pid=16", children: [{ label: "Test link", href: `/page?pid=${target}` }] }]) } });
      await assert.rejects(publishPage(tx, "related-navigation", links.updatedAt.toISOString()), WebsitePublishConflict);
      await publishPage(tx, target, page.updatedAt.toISOString());
      const current = await tx.websitePageDraft.findUniqueOrThrow({ where: { pageId: "related-navigation" } });
      const change = await publishPage(tx, "related-navigation", current.updatedAt.toISOString());
      assert.ok(change.beforeText?.includes(JSON.stringify(defaultRelatedNavigation(), null, 2)));
      assert.ok(change.afterText?.includes("Test link"));
      throw rollback;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }), (error) => error === rollback);
  } finally { await db.$disconnect(); }
});
