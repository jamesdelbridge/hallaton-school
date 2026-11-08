import { ConsentChoice } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageProfiles, canManageSchoolContent } from "@/lib/permissions";
import { staffAccess } from "@/lib/staff-access";

const updateInput = z.object({
  studentId: z.string().min(1),
  choice: z.nativeEnum(ConsentChoice),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canManageProfiles(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const access = await staffAccess(session.user.id, session.user.role);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const students = await db.student.findMany({
    where: access.admin || access.safeguarding ? {} : { classGroupId: { in: access.classIds } },
    select: {
      id: true,
      socialConsent: { select: { choice: true, updatedAt: true } },
      reference: true,
      firstName: true,
      lastName: true,
      updatedAt: true,
      classGroup: { select: { name: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  const records = students.map(({ id, socialConsent, updatedAt, ...student }) => ({
    choice: socialConsent?.choice ?? ConsentChoice.PENDING,
    updatedAt: socialConsent?.updatedAt ?? updatedAt,
    student: { id, ...student },
  }));
  if (students.length) await db.$transaction(students.map((student) => db.auditLog.create({ data: {
    actorId: session.user.id, action: "READ_CONSENT", entityType: "SocialMediaConsent", entityId: student.id,
    students: { create: { studentId: student.id } },
  } })));
  if (!students.length) await db.auditLog.create({ data: { actorId: session.user.id, action: "READ_CONSENT", entityType: "SocialMediaConsent", entityId: "list" } });
  records.sort((a, b) => a.choice.localeCompare(b.choice) || a.student.lastName.localeCompare(b.student.lastName));
  return NextResponse.json(records);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canManageSchoolContent(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const access = await staffAccess(session.user.id, session.user.role);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = updateInput.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid consent record" }, { status: 400 });
  const student = await db.student.findUnique({
    where: { id: parsed.data.studentId },
    select: { id: true, classGroupId: true },
  });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  if (!access.admin && (!student.classGroupId || !access.classIds.includes(student.classGroupId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const consent = await db.$transaction(async (tx) => {
    const updated = await tx.socialMediaConsent.upsert({
    where: { studentId: parsed.data.studentId },
    create: { studentId: parsed.data.studentId, choice: parsed.data.choice },
    update: { choice: parsed.data.choice },
    select: { choice: true, updatedAt: true },
    });
    await tx.auditLog.create({ data: { actorId: session.user.id, action: "UPDATE_CONSENT", entityType: "SocialMediaConsent", entityId: parsed.data.studentId, students: { create: { studentId: parsed.data.studentId } } } });
    return updated;
  });
  return NextResponse.json(consent);
}
