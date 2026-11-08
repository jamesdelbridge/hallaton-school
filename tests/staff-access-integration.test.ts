import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { hash } from "bcryptjs";

test("staff class, sports and event approval boundaries", { skip: process.env.RUN_STAFF_HTTP_TESTS !== "1" }, async () => {
  loadEnvConfig(process.cwd());
  assert.equal(new URL(process.env.DATABASE_URL ?? "").pathname, "/hallaton_copilot_demo", "Refusing a non-demo database");
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  const base = "http://127.0.0.1:3002";
  const suffix = randomBytes(8).toString("hex");
  const password = `test-${randomBytes(18).toString("hex")}`;
  const userIds: string[] = [], studentIds: string[] = [], classIds: string[] = [], eventIds: string[] = [];
  async function signIn(email: string) {
    const csrf = await fetch(`${base}/api/auth/csrf`);
    const cookie = csrf.headers.getSetCookie().map((entry) => entry.split(";")[0]).join("; ");
    const { csrfToken } = await csrf.json();
    const result = await fetch(`${base}/api/auth/callback/credentials`, { method: "POST", redirect: "manual", headers: { cookie, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ csrfToken, email, password }) });
    const token = result.headers.getSetCookie().map((entry) => entry.split(";")[0]).find((entry) => entry.startsWith("next-auth.session-token="));
    assert.ok(token);
    return token;
  }
  async function send(path: string, method: string, cookie: string, body?: unknown) {
    return fetch(`${base}${path}`, { method, headers: { cookie, "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  }
  try {
    const passwordHash = await hash(password, 10);
    const makeUser = async (label: string, role: "TEACHER" | "PARENT" | "SUPER_ADMIN") => {
      const user = await db.user.create({ data: { email: `${label}-${suffix}@example.test`, passwordHash, role } });
      userIds.push(user.id);
      return user;
    };
    const admin = await makeUser("admin", "SUPER_ADMIN");
    const teacher = await makeUser("teacher", "TEACHER");
    const parent = await makeUser("parent", "PARENT");
    const first = await db.classGroup.create({ data: { name: `Maple ${suffix}`, yearGroup: "Test" } }); classIds.push(first.id);
    const second = await db.classGroup.create({ data: { name: `Oak ${suffix}`, yearGroup: "Test" } }); classIds.push(second.id);
    const pupil1 = await db.student.create({ data: { reference: `maple-${suffix}`, firstName: "Maple", lastName: "Test", classGroupId: first.id } }); studentIds.push(pupil1.id);
    const pupil2 = await db.student.create({ data: { reference: `oak-${suffix}`, firstName: "Oak", lastName: "Test", classGroupId: second.id } }); studentIds.push(pupil2.id);
    await db.parentLink.create({ data: { userId: parent.id, studentId: pupil2.id } });
    const adminCookie = await signIn(admin.email!);
    const teacherCookie = await signIn(teacher.email!);
    const parentCookie = await signIn(parent.email!);
    const accessUrl = `/api/staff/users/${teacher.id}/access`;
    assert.equal((await send(accessUrl, "PUT", teacherCookie, { classIds: [first.id], sports: true, safeguardingLead: false })).status, 403);
    assert.equal((await send(accessUrl, "PUT", adminCookie, { classIds: [first.id], sports: false, safeguardingLead: false })).status, 200);
    const classLearning = { weekOf: "2099-01-05", learning: "Test learning" };
    assert.equal((await send("/api/staff/learning", "POST", teacherCookie, { ...classLearning, classGroupId: first.id })).status, 201);
    assert.equal((await send("/api/staff/learning", "POST", teacherCookie, { ...classLearning, classGroupId: second.id })).status, 403);
    assert.equal((await send("/api/staff/learning/feedback", "POST", teacherCookie, { studentId: pupil2.id, feedback: "Out of scope" })).status, 403);
    const profiles = await (await send("/api/staff/students", "GET", teacherCookie)).json();
    assert.deepEqual(profiles.map((student: { id: string }) => student.id), [pupil1.id]);
    const payload = { type: "event", category: "SPORTS", title: "Test sports event", description: "Test event details", startsAt: "2099-01-06T12:00:00Z", studentIds: [pupil2.id] };
    assert.equal((await send("/api/staff/content", "POST", teacherCookie, payload)).status, 403);
    assert.equal((await send(accessUrl, "PUT", adminCookie, { classIds: [first.id], sports: true, safeguardingLead: true })).status, 200);
    assert.equal((await send("/api/staff/content", "POST", teacherCookie, { ...payload, category: "GENERAL" })).status, 403);
    assert.equal((await send("/api/staff/learning/feedback", "POST", teacherCookie, { studentId: pupil2.id, feedback: "Still out of scope" })).status, 403);
    assert.equal((await send("/api/staff/learning/feedback", "POST", teacherCookie, { studentId: pupil1.id, feedback: "Class feedback" })).status, 201);
    const created = await send("/api/staff/content", "POST", teacherCookie, payload);
    assert.equal(created.status, 201);
    const event = await created.json(); eventIds.push(event.id);
    assert.equal(event.approved, false);
    assert.equal((await send("/api/staff/events", "GET", parentCookie)).status, 200);
    assert.equal((await (await send("/api/staff/events", "GET", parentCookie)).json()).some((invite: { event: { id: string } }) => invite.event.id === event.id), false);
    assert.equal((await send(`/api/staff/events/${event.id}/approve`, "POST", teacherCookie)).status, 403);
    assert.equal((await send("/api/staff/content", "PATCH", adminCookie, { type: "event", id: event.id, publish: true, publicTitle: "Public event", publicSummary: "Public details" })).status, 400);
    assert.equal((await send(`/api/staff/events/${event.id}/approve`, "POST", adminCookie)).status, 200);
    assert.equal((await (await send("/api/staff/events", "GET", parentCookie)).json()).some((invite: { event: { id: string } }) => invite.event.id === event.id), true);
    assert.equal((await send("/api/staff/events/feedback", "POST", teacherCookie, { eventId: event.id, studentId: pupil2.id, feedback: "Sports feedback" })).status, 201);
    assert.equal((await send("/api/staff/events/feedback", "GET", parentCookie)).status, 403);
    const concernResponse = await send("/api/staff/safeguarding", "POST", teacherCookie, { studentId: pupil2.id, details: "A test concern for another class" });
    assert.equal(concernResponse.status, 201);
    const concern = await concernResponse.json();
    assert.equal((await send(`/api/staff/safeguarding/${concern.id}`, "GET", teacherCookie)).status, 200);
    assert.equal((await send("/api/staff/audit", "GET", teacherCookie)).status, 200);
    assert.equal((await send(accessUrl, "PUT", adminCookie, { classIds: [], sports: false, safeguardingLead: false })).status, 200);
    assert.equal((await send("/api/staff/events/feedback", "GET", teacherCookie)).status, 403);
    assert.equal((await send(`/api/staff/safeguarding/${concern.id}`, "GET", teacherCookie)).status, 403);
    assert.equal((await send("/api/staff/learning", "POST", teacherCookie, { ...classLearning, classGroupId: first.id })).status, 403);
    assert.equal((await send("/api/staff/safeguarding", "POST", teacherCookie, { studentId: pupil2.id, details: "A test concern for another class" })).status, 201);
  } finally {
    await db.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
    await db.safeguardingConcern.deleteMany({ where: { studentId: { in: studentIds } } });
    await db.eventFeedback.deleteMany({ where: { authorId: { in: userIds } } });
    await db.curriculumFeedback.deleteMany({ where: { authorId: { in: userIds } } });
    await db.eventInvite.deleteMany({ where: { eventId: { in: eventIds } } });
    await db.schoolEvent.deleteMany({ where: { id: { in: eventIds } } });
    await db.weeklyLearning.deleteMany({ where: { classGroupId: { in: classIds } } });
    await db.parentLink.deleteMany({ where: { userId: { in: userIds } } });
    await db.student.deleteMany({ where: { id: { in: studentIds } } });
    await db.staffClassAssignment.deleteMany({ where: { userId: { in: userIds } } });
    await db.classGroup.deleteMany({ where: { id: { in: classIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.$disconnect();
  }
});
