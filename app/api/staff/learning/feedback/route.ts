import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { staffAccess } from "@/lib/staff-access";
import { decryptPrivateData, encryptPrivateData } from "@/lib/encryption";

const input = z.object({ studentId: z.string().min(1), feedback: z.string().trim().min(1).max(5000) });

export async function GET() {
  const session = await getServerSession(authOptions);
  const access = session?.user && await staffAccess(session.user.id, session.user.role);
  if (!session?.user || !access || access.safeguarding) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const entries = await db.curriculumFeedback.findMany({
    where: access.admin ? {} : { student: { classGroupId: { in: access.classIds } } },
    select: { id: true, studentId: true, encryptedBody: true, student: { select: { firstName: true, lastName: true } }, author: { select: { name: true } } },
    orderBy: { createdAt: "desc" }, take: 100,
  });
  await db.auditLog.create({ data: { actorId: session.user.id, action: "READ_CURRICULUM_FEEDBACK", entityType: "CurriculumFeedback", entityId: "list", students: { create: [...new Set(entries.map((entry) => entry.studentId))].map((studentId) => ({ studentId })) } } });
  return NextResponse.json(entries.map(({ encryptedBody, ...entry }) => ({ ...entry, feedback: decryptPrivateData(encryptedBody) })), { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const access = session?.user && await staffAccess(session.user.id, session.user.role);
  if (!session?.user || !access || access.safeguarding) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid curriculum feedback." }, { status: 400 });
  const student = await db.student.findFirst({ where: { id: parsed.data.studentId, ...(access.admin ? {} : { classGroupId: { in: access.classIds } }) }, select: { id: true } });
  if (!student) return NextResponse.json({ error: "Pupil not found in an assigned class." }, { status: 403 });
  await db.$transaction(async (tx) => {
    const entry = await tx.curriculumFeedback.create({ data: { studentId: student.id, authorId: session.user.id, encryptedBody: encryptPrivateData(parsed.data.feedback) } });
    await tx.auditLog.create({ data: { actorId: session.user.id, action: "CREATE_CURRICULUM_FEEDBACK", entityType: "CurriculumFeedback", entityId: entry.id, students: { create: { studentId: student.id } } } });
  });
  return NextResponse.json({ saved: true }, { status: 201 });
}
