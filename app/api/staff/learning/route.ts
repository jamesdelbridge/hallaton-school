import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageSchoolContent, isStaff } from "@/lib/permissions";
import { activeEnquiryRole } from "@/lib/enquiry-access";
import { staffAccess } from "@/lib/staff-access";

const input = z.object({
  classGroupId: z.string().min(1),
  weekOf: z.coerce.date(),
  learning: z.string().trim().min(1).max(10_000),
  homework: z.string().max(10_000).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((!isStaff(session.user.role) && session.user.role !== Role.PARENT) || !(await activeEnquiryRole(session.user.id, session.user.role))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const access = session.user.role === Role.PARENT ? null : await staffAccess(session.user.id, session.user.role);
  const where =
    session.user.role === Role.PARENT
      ? {
          classGroup: {
            students: {
              some: { parentLinks: { some: { userId: session.user.id } } },
            },
          },
        }
      : access?.admin || access?.safeguarding ? {} : { classGroupId: { in: access?.classIds ?? [] } };
  const learning = await db.weeklyLearning.findMany({
    where,
    select: {
      id: true,
      weekOf: true,
      learning: true,
      homework: true,
      classGroup: { select: { id: true, name: true, yearGroup: true } },
    },
    orderBy: { weekOf: "desc" },
    take: 30,
  });
  if (session.user.role !== Role.PARENT) await db.auditLog.create({ data: { actorId: session.user.id, action: "READ_LEARNING", entityType: "WeeklyLearning", entityId: "list" } });
  return NextResponse.json(learning);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canManageSchoolContent(session.user.role) || !(await activeEnquiryRole(session.user.id, session.user.role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = input.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid learning details" }, { status: 400 });
  const access = await staffAccess(session.user.id, session.user.role);
  if (!access || (!access.admin && !access.classIds.includes(parsed.data.classGroupId))) return NextResponse.json({ error: "You can only update learning for an assigned class." }, { status: 403 });
  const group = await db.classGroup.findUnique({
    where: { id: parsed.data.classGroupId },
    select: { id: true },
  });
  if (!group) return NextResponse.json({ error: "Class not found" }, { status: 404 });
  const entry = await db.$transaction(async (tx) => {
    const result = await tx.weeklyLearning.upsert({
    where: {
      classGroupId_weekOf: {
        classGroupId: parsed.data.classGroupId,
        weekOf: parsed.data.weekOf,
      },
    },
    create: parsed.data,
    update: { learning: parsed.data.learning, homework: parsed.data.homework },
    });
    const students = await tx.student.findMany({ where: { classGroupId: parsed.data.classGroupId }, select: { id: true } });
    await tx.auditLog.create({ data: { actorId: session.user.id, action: "SAVE_LEARNING", entityType: "WeeklyLearning", entityId: result.id, students: { create: students.map(({ id }) => ({ studentId: id })) } } });
    return result;
  });
  return NextResponse.json(entry, { status: 201 });
}
