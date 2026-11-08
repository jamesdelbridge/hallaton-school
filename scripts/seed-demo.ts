import { loadEnvConfig } from "@next/env";
import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { encryptPrivateData } from "../lib/encryption";

loadEnvConfig(process.cwd());
const url = new URL(process.env.DATABASE_URL ?? "");
if (url.pathname !== "/hallaton_copilot_demo" || !["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname)) {
  throw new Error("Demo seeding is permitted only on the local hallaton_copilot_demo database.");
}
if (process.env.CONFIRM_DEMO_SEED !== "fictional-data-only") throw new Error("Set CONFIRM_DEMO_SEED=fictional-data-only to confirm.");
const password = process.env.DEMO_PASSWORD;
if (!password || password.length < 14 || Buffer.byteLength(password) > 72) throw new Error("Set DEMO_PASSWORD to a unique temporary password of 14–72 bytes.");

const db = new PrismaClient();
const prefix = "showcase-2026-";
const id = (value: string) => prefix + value;
const dateInDays = (days: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(12, 0, 0, 0);
  return date;
};

async function main() {
  const existing = await db.auditLog.findFirst({ where: { entityType: "DemoSeed", entityId: prefix, action: "CREATE_DEMO_DATA" }, select: { id: true } });
  if (existing) {
    console.log("The showcase dataset is already installed. No records or passwords were changed.");
    return;
  }
  const passwordHash = await hash(password!, 12);
  await db.$transaction(async (tx) => {
    const accounts = [
      { key: "admin", name: "Demo Administrator", role: Role.SUPER_ADMIN },
      { key: "maple", name: "Demo Maple Teacher", role: Role.TEACHER, sportsCoordinator: true },
      { key: "oak", name: "Demo Oak Teacher", role: Role.TEACHER },
      { key: "lead", name: "Demo Safeguarding Lead", role: Role.SAFEGUARDING_LEAD },
      { key: "parent-maple", name: "Demo Alex Family", role: Role.PARENT },
      { key: "parent-maple-second", name: "Demo Sam Family", role: Role.PARENT },
      { key: "parent-oak", name: "Demo Morgan Family", role: Role.PARENT },
    ];
    for (const account of accounts) {
      await tx.user.create({ data: { id: id(account.key), email: `${account.key}@showcase.example.test`, name: account.name, role: account.role, sportsCoordinator: account.sportsCoordinator ?? false, passwordHash } });
    }
    await tx.classGroup.createMany({ data: [
      { id: id("class-maple"), name: "Maple (demo)", yearGroup: "Demo" },
      { id: id("class-oak"), name: "Oak (demo)", yearGroup: "Demo" },
    ] });
    await tx.staffClassAssignment.createMany({ data: [
      { userId: id("maple"), classGroupId: id("class-maple") },
      { userId: id("oak"), classGroupId: id("class-oak") },
    ] });
    await tx.student.createMany({ data: [
      { id: id("pupil-maple"), reference: "SHOWCASE-MAPLE", firstName: "Avery", lastName: "Example", classGroupId: id("class-maple"), privateProfile: encryptPrivateData(JSON.stringify({ emergencyContacts: "Fictional contacts only", medical: "No real medical data", dietary: "No real dietary data" })) },
      { id: id("pupil-oak"), reference: "SHOWCASE-OAK", firstName: "Robin", lastName: "Example", classGroupId: id("class-oak"), privateProfile: encryptPrivateData(JSON.stringify({ emergencyContacts: "Fictional contacts only", medical: "No real medical data", dietary: "No real dietary data" })) },
    ] });
    await tx.parentLink.createMany({ data: [
      { userId: id("parent-maple"), studentId: id("pupil-maple"), relation: "Demo parent" },
      { userId: id("parent-maple-second"), studentId: id("pupil-maple"), relation: "Demo parent" },
      { userId: id("parent-oak"), studentId: id("pupil-oak"), relation: "Demo parent" },
    ] });
    await tx.socialMediaConsent.createMany({ data: [
      { studentId: id("pupil-maple"), choice: "GRANTED" },
      { studentId: id("pupil-oak"), choice: "PENDING" },
    ] });
    await tx.weeklyLearning.createMany({ data: [
      { id: id("learning-maple"), classGroupId: id("class-maple"), weekOf: dateInDays(0), learning: "Fictional demo: exploring stories and patterns.", homework: "Read a favourite story." },
      { id: id("learning-oak"), classGroupId: id("class-oak"), weekOf: dateInDays(0), learning: "Fictional demo: exploring nature and measurement.", homework: "Notice shapes outdoors." },
    ] });
    await tx.schoolEvent.createMany({ data: [
      { id: id("event-public"), title: "Demo school celebration", description: "Fictional example; not a real school event.", startsAt: dateInDays(35), approved: true, published: true, publicTitle: "Demo school celebration", publicSummary: "Fictional event for the portal demonstration; not a real booking.", createdById: id("admin") },
      { id: id("event-private"), title: "Demo Maple family afternoon", description: "Fictional invitation for a Maple family.", startsAt: dateInDays(21), approved: true, published: false, meetingInfo: "Fictional meeting details", createdById: id("admin") },
      { id: id("event-sports"), title: "Demo Uppingham sports afternoon", category: "SPORTS", description: "Fictional proposed sports event in Uppingham; no venue or booking has been arranged.", startsAt: dateInDays(49), approved: false, published: false, publicTitle: "Demo Uppingham sports afternoon", publicSummary: "Fictional sports event for demonstration only; not a confirmed event.", meetingInfo: "Fictional meeting point; confirm before use", gearList: "Fictional list: trainers and water", createdById: id("maple") },
      { id: id("event-general"), title: "Demo Uppingham arts visit", category: "GENERAL", description: "Fictional proposed arts visit in Uppingham; no venue or booking has been arranged.", startsAt: dateInDays(63), approved: false, published: false, publicTitle: "Demo Uppingham arts visit", publicSummary: "Fictional visit for demonstration only; not a confirmed event.", createdById: id("oak") },
    ] });
    await tx.eventInvite.createMany({ data: [
      { eventId: id("event-private"), studentId: id("pupil-maple"), userId: id("parent-maple") },
      { eventId: id("event-private"), studentId: id("pupil-maple"), userId: id("parent-maple-second") },
      { eventId: id("event-sports"), studentId: id("pupil-maple"), userId: id("parent-maple") },
      { eventId: id("event-sports"), studentId: id("pupil-maple"), userId: id("parent-maple-second") },
      { eventId: id("event-sports"), studentId: id("pupil-oak"), userId: id("parent-oak") },
      { eventId: id("event-general"), studentId: id("pupil-oak"), userId: id("parent-oak") },
    ] });
    await tx.curriculumFeedback.create({ data: { id: id("curriculum"), studentId: id("pupil-maple"), authorId: id("maple"), encryptedBody: encryptPrivateData("Fictional example: Avery enjoyed the class reading activity.") } });
    await tx.safeguardingConcern.create({ data: { id: id("concern"), studentId: id("pupil-oak"), reporterId: id("maple"), encryptedBody: encryptPrivateData("Fictional demonstration record only; no real concern or pupil.") } });
    await tx.announcement.create({ data: { id: id("news"), title: "Demo school news", body: "Fictional update to demonstrate publication.", authorId: id("maple") } });
    await tx.auditLog.create({ data: { actorId: id("admin"), action: "CREATE_DEMO_DATA", entityType: "DemoSeed", entityId: prefix } });
  });
  console.log("Fictional showcase accounts, pupils, learning, events and drafts created.");
}

main().finally(() => db.$disconnect());
