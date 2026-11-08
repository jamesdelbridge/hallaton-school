import assert from "node:assert/strict";
import test from "node:test";
import { loadEnvConfig } from "@next/env";

test("configuration snapshot restores published settings without altering pupil data", { skip: process.env.RUN_DEMO_DB_TESTS !== "1" }, async () => {
  loadEnvConfig(process.cwd());
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.pathname, "/hallaton_copilot_demo", "Refusing to run against a non-demo database");
  const { PrismaClient, Prisma } = await import("@prisma/client");
  const { snapshotWebsiteConfig, restoreWebsiteConfig } = await import("../lib/website-snapshot");
  const db = new PrismaClient();
  const rollback = new Error("Intentional rollback");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const actor = await tx.user.findFirstOrThrow({ where: { role: "SUPER_ADMIN", active: true } });
      const before = await tx.websitePagePublished.findMany({ orderBy: { pageId: "asc" }, select: { pageId: true, title: true, body: true, documents: true } });
      const studentCount = await tx.student.count();
      const auditCount = await tx.auditLog.count();
      await snapshotWebsiteConfig(tx, actor.id, "Test");
      const saved = await tx.websiteConfigSnapshot.findFirstOrThrow({ where: { actorId: actor.id, reason: "Test" }, orderBy: { createdAt: "desc" } });
      await tx.websitePagePublished.create({ data: { pageId: "__snapshot_test__", title: "Test", body: "Test" } });
      await restoreWebsiteConfig(tx, saved.content);
      assert.deepEqual(await tx.websitePagePublished.findMany({ orderBy: { pageId: "asc" }, select: { pageId: true, title: true, body: true, documents: true } }), before);
      assert.equal(await tx.student.count(), studentCount);
      assert.equal(await tx.auditLog.count(), auditCount + 1);
      throw rollback;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }), (error) => error === rollback);
  } finally { await db.$disconnect(); }
});

test("custom navigation cannot publish until its destination is live", { skip: process.env.RUN_DEMO_DB_TESTS !== "1" }, async () => {
  loadEnvConfig(process.cwd());
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.pathname, "/hallaton_copilot_demo", "Refusing to run against a non-demo database");
  const { PrismaClient, Prisma } = await import("@prisma/client");
  const { publishPage, WebsitePublishConflict } = await import("../lib/website-publish");
  const { defaultHomeLayout } = await import("../lib/website-home-layout");
  const db = new PrismaClient();
  const rollback = new Error("Intentional rollback");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const id = "custom-snapshot-test-page";
      assert.equal(await tx.websitePagePublished.findUnique({ where: { pageId: id } }), null);
      assert.equal(await tx.websitePageDraft.findUnique({ where: { pageId: id } }), null);
      const live = await tx.websitePagePublished.findUnique({ where: { pageId: "navigation" } });
      const liveLayout = await tx.websitePagePublished.findUnique({ where: { pageId: "home-layout" } });
      await tx.websitePageDraft.deleteMany({ where: { pageId: "navigation" } });
      await tx.websitePageDraft.deleteMany({ where: { pageId: "home-layout" } });
      const page = await tx.websitePageDraft.create({ data: { pageId: id, title: "Test", body: "Test" } });
      const nav = await tx.websitePageDraft.create({ data: { pageId: "navigation", title: "Navigation", body: JSON.stringify([{ label: "Test", href: `/page?pid=${id}` }]), baseUpdatedAt: live?.updatedAt ?? null } });
      const layout = await tx.websitePageDraft.create({ data: { pageId: "home-layout", title: "Homepage links", body: JSON.stringify({ ...defaultHomeLayout, links: { ...defaultHomeLayout.links, welcome: `/page?pid=${id}` } }), baseUpdatedAt: liveLayout?.updatedAt ?? null } });
      await assert.rejects(publishPage(tx, "navigation", nav.updatedAt.toISOString()), WebsitePublishConflict);
      await assert.rejects(publishPage(tx, "home-layout", layout.updatedAt.toISOString()), WebsitePublishConflict);
      await publishPage(tx, id, page.updatedAt.toISOString());
      const current = await tx.websitePageDraft.findUniqueOrThrow({ where: { pageId: "navigation" } });
      await publishPage(tx, "navigation", current.updatedAt.toISOString());
      const currentLayout = await tx.websitePageDraft.findUniqueOrThrow({ where: { pageId: "home-layout" } });
      await publishPage(tx, "home-layout", currentLayout.updatedAt.toISOString());
      assert.ok(await tx.websitePagePublished.findUnique({ where: { pageId: id } }));
      throw rollback;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }), (error) => error === rollback);
  } finally { await db.$disconnect(); }
});

test("public updates are restored without republishing withdrawn events", { skip: process.env.RUN_DEMO_DB_TESTS !== "1" }, async () => {
  loadEnvConfig(process.cwd());
  assert.equal(new URL(process.env.DATABASE_URL ?? "").pathname, "/hallaton_copilot_demo", "Refusing to run against a non-demo database");
  const { PrismaClient, Prisma } = await import("@prisma/client");
  const { snapshotWebsiteConfig, restoreWebsiteConfig, WebsiteSnapshotConflict } = await import("../lib/website-snapshot");
  const db = new PrismaClient();
  const rollback = new Error("Intentional rollback");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const actor = await tx.user.findFirstOrThrow({ where: { role: "SUPER_ADMIN", active: true } });
      const announcement = await tx.announcement.create({ data: { title: "Snapshot test", body: "Public notice", authorId: actor.id, publishedAt: new Date() } });
      const event = await tx.schoolEvent.create({ data: { title: "Private details", description: "Private description", startsAt: new Date("2099-01-01T12:00:00Z"), published: true, publicTitle: "Public title", publicSummary: "Public summary" } });
      await snapshotWebsiteConfig(tx, actor.id, "Updates test");
      const snapshot = await tx.websiteConfigSnapshot.findFirstOrThrow({ where: { actorId: actor.id, reason: "Updates test" }, orderBy: { createdAt: "desc" } });
      const later = await tx.announcement.create({ data: { title: "Later test", body: "Later notice", authorId: actor.id, publishedAt: new Date() } });
      await tx.announcement.update({ where: { id: announcement.id }, data: { publishedAt: null } });
      await tx.schoolEvent.update({ where: { id: event.id }, data: { published: false } });
      await assert.rejects(restoreWebsiteConfig(tx, snapshot.content), WebsiteSnapshotConflict);
      assert.equal((await tx.announcement.findUniqueOrThrow({ where: { id: announcement.id } })).publishedAt, null);
      await tx.schoolEvent.update({ where: { id: event.id }, data: { published: true } });
      await restoreWebsiteConfig(tx, snapshot.content);
      assert.ok((await tx.announcement.findUniqueOrThrow({ where: { id: announcement.id } })).publishedAt);
      assert.equal((await tx.announcement.findUniqueOrThrow({ where: { id: later.id } })).publishedAt, null);
      assert.equal((await tx.schoolEvent.findUniqueOrThrow({ where: { id: event.id } })).description, "Private description");
      throw rollback;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }), (error) => error === rollback);
  } finally { await db.$disconnect(); }
});
