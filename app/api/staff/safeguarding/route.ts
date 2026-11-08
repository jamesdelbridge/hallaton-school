import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { encryptPrivateData } from "@/lib/encryption";
import { canAccessSafeguarding } from "@/lib/permissions";
import { staffAccess } from "@/lib/staff-access";

const concernInput = z.object({
  studentId: z.string().min(1),
  details: z.string().trim().min(10).max(10_000),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canAccessSafeguarding(session.user.role) || !(await staffAccess(session.user.id, session.user.role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const concerns = await db.safeguardingConcern.findMany({
    select: { id: true, studentId: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  if (concerns.length) await db.$transaction(concerns.map((concern) => db.auditLog.create({ data: {
    actorId: session.user.id, action: "READ_REGISTER", entityType: "SafeguardingConcern", entityId: concern.id,
    students: { create: { studentId: concern.studentId } },
  } })));
  if (!concerns.length) await db.auditLog.create({ data: { actorId: session.user.id, action: "READ_REGISTER", entityType: "SafeguardingConcern", entityId: "register" } });
  return NextResponse.json(concerns);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canAccessSafeguarding(session.user.role) || !(await staffAccess(session.user.id, session.user.role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = concernInput.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid concern details" }, { status: 400 });

  const student = await db.student.findUnique({
    where: { id: parsed.data.studentId },
    select: { id: true },
  });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const concern = await db.$transaction(async (transaction) => {
    const record = await transaction.safeguardingConcern.create({
      data: {
        studentId: student.id,
        reporterId: session.user.id,
        encryptedBody: encryptPrivateData(parsed.data.details),
      },
      select: { id: true, status: true, createdAt: true },
    });
    await transaction.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "CREATE",
        entityType: "SafeguardingConcern",
        entityId: record.id,
        students: { create: { studentId: student.id } },
      },
    });
    return record;
  });
  return NextResponse.json(concern, { status: 201 });
}
