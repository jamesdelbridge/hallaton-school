import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { hash } from "bcryptjs";

test("meal APIs enforce family links, stale writes and caterer scope", { skip: process.env.RUN_MEAL_HTTP_TESTS !== "1" }, async () => {
  loadEnvConfig(process.cwd());
  assert.equal(new URL(process.env.DATABASE_URL ?? "").pathname, "/hallaton_copilot_demo", "Refusing to run against a non-demo database");
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  const base = "http://127.0.0.1:3002";
  const suffix = randomBytes(8).toString("hex");
  const password = `test-${randomBytes(18).toString("hex")}`;
  let parentId = "", adminId = "", studentId = "", otherStudentId = "", tokenId = "";
  let settingsCreated = false, menuCreated = false;
  const menuDate = "2099-01-05";
  async function signIn(email: string) {
    const csrf = await fetch(`${base}/api/auth/csrf`);
    const cookie = csrf.headers.getSetCookie().map((entry) => entry.split(";")[0]).join("; ");
    const { csrfToken } = await csrf.json();
    const response = await fetch(`${base}/api/auth/callback/credentials`, {
      method: "POST", redirect: "manual", headers: { cookie, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken, email, password, callbackUrl: `${base}/parent` }),
    });
    const session = response.headers.getSetCookie().map((entry) => entry.split(";")[0]).find((entry) => entry.startsWith("next-auth.session-token="));
    assert.ok(session, "Sign-in did not issue a session cookie");
    return session;
  }
  async function send(path: string, method: string, body: unknown, cookie?: string, bearer?: string) {
    return fetch(`${base}${path}`, { method, headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}), ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  }
  try {
    assert.equal(await db.mealSettings.count(), 0, "Integration test requires an unconfigured demo planner");
    assert.equal(await db.mealMenu.count({ where: { date: menuDate } }), 0, "Integration test menu date already exists");
    const passwordHash = await hash(password, 10);
    const parent = await db.user.create({ data: { email: `test-parent-${suffix}@example.test`, passwordHash, role: "PARENT" } });
    parentId = parent.id;
    const admin = await db.user.create({ data: { email: `test-admin-${suffix}@example.test`, passwordHash, role: "SUPER_ADMIN" } });
    adminId = admin.id;
    const student = await db.student.create({ data: { reference: `test-${suffix}`, firstName: "Test", lastName: "Family" } });
    studentId = student.id;
    const other = await db.student.create({ data: { reference: `other-${suffix}`, firstName: "Other", lastName: "Family" } });
    otherStudentId = other.id;
    await db.parentLink.create({ data: { studentId, userId: parentId } });
    const parentCookie = await signIn(parent.email!);
    const adminCookie = await signIn(admin.email!);
    assert.equal((await send("/api/staff/meals", "GET", undefined, parentCookie)).status, 403);
    assert.equal((await send("/api/parent/meals", "GET", undefined)).status, 403);
    let response = await send("/api/staff/meals", "POST", { type: "settings", settings: { periodStart: "2099-01-05", periodEnd: "2099-12-31", pricePence: 300, cutoffDays: 1, cutoffTime: "12:00" } }, adminCookie);
    assert.equal(response.status, 200); settingsCreated = true;
    response = await send("/api/staff/meals", "POST", { type: "menu", date: menuDate, menu: "Test menu" }, adminCookie);
    assert.equal(response.status, 200); menuCreated = true;
    response = await send("/api/parent/meals", "POST", { type: "plan", studentId: otherStudentId, weekdays: [1], version: null }, parentCookie);
    assert.equal(response.status, 403);
    response = await send("/api/parent/meals", "POST", { type: "plan", studentId, weekdays: [1], version: null }, parentCookie);
    assert.equal(response.status, 200);
    const family = await (await send("/api/parent/meals", "GET", undefined, parentCookie)).json();
    assert.deepEqual(family.students.map((item: { id: string }) => item.id), [studentId]);
    assert.equal((await send("/api/parent/meals", "POST", { type: "plan", studentId, weekdays: [2], version: null }, parentCookie)).status, 409);
    response = await send("/api/parent/meals", "POST", { type: "exception", studentId, date: menuDate, packed: true, version: null }, parentCookie);
    assert.equal(response.status, 200);
    response = await send("/api/parent/meals", "POST", { type: "exception", studentId, date: "2099-01-12", packed: true, version: null }, parentCookie);
    assert.equal(response.status, 200);
    const planner = await (await send("/api/staff/meals", "GET", undefined, adminCookie)).json();
    assert.equal(planner.menus[0].schoolMeals, 0);
    assert.equal(planner.menus[0].packedLunches, 1);
    assert.equal(planner.menus[0].packedStudents[0].reference, `test-${suffix}`);
    assert.equal(planner.menus[1].menu, "Menu not yet added");
    assert.equal(planner.menus[1].packedLunches, 1);
    response = await send("/api/staff/caterer-tokens", "POST", { name: `Test ${suffix}` }, adminCookie);
    assert.equal(response.status, 201);
    const { token } = await response.json();
    tokenId = (await db.catererToken.findFirstOrThrow({ where: { name: `Test ${suffix}` } })).id;
    response = await send("/api/caterer/menus", "PUT", { menus: [{ date: menuDate, menu: "Caterer menu" }] }, undefined, token);
    assert.equal(response.status, 200);
    const caterer = await (await send("/api/caterer/menus", "GET", undefined, undefined, token)).text();
    assert.ok(!caterer.includes(`test-${suffix}`));
    assert.equal((await send("/api/staff/students", "GET", undefined, undefined, token)).status, 401);
    assert.equal((await send("/api/staff/caterer-tokens", "DELETE", { id: tokenId }, adminCookie)).status, 200);
    assert.equal((await send("/api/caterer/menus", "GET", undefined, undefined, token)).status, 401);
    await db.user.update({ where: { id: parentId }, data: { active: false } });
    for (const path of ["/api/parent/meals", "/api/staff/learning", "/api/staff/events"]) assert.equal((await send(path, "GET", undefined, parentCookie)).status, 403);
  } finally {
    if (parentId || adminId || tokenId) await db.auditLog.deleteMany({ where: { OR: [{ actorId: { in: [parentId, adminId].filter(Boolean) } }, ...(tokenId ? [{ entityType: "CatererToken", entityId: tokenId }] : [])] } });
    if (tokenId) await db.catererToken.deleteMany({ where: { id: tokenId } });
    if (studentId || otherStudentId) await db.student.deleteMany({ where: { id: { in: [studentId, otherStudentId].filter(Boolean) } } });
    if (parentId || adminId) await db.user.deleteMany({ where: { id: { in: [parentId, adminId].filter(Boolean) } } });
    if (menuCreated) await db.mealMenu.deleteMany({ where: { date: menuDate } });
    if (settingsCreated) await db.mealSettings.deleteMany({ where: { id: "school", periodStart: "2099-01-05" } });
    await db.$disconnect();
  }
});
