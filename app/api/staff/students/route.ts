import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageProfiles, canManageSchoolContent } from "@/lib/permissions";
import { decryptPrivateData, encryptPrivateData } from "@/lib/encryption";
import { staffAccess } from "@/lib/staff-access";
import { activeEnquiryRole } from "@/lib/enquiry-access";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === Role.PARENT) {
    if (!(await activeEnquiryRole(session.user.id, session.user.role))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const links = await db.parentLink.findMany({
      where: { userId: session.user.id },
      select: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            classGroup: { select: { name: true } },
          },
        },
      },
    });
    return NextResponse.json(links.map(({ student }) => student));
  }
  if (!canManageProfiles(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const access = await staffAccess(session.user.id, session.user.role);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const students = await db.student.findMany({
    where: access.admin || access.safeguarding ? {} : { classGroupId: { in: access.classIds } },
    select: {
      id: true,
      reference: true,
      firstName: true,
      lastName: true,
      privateProfile: true,
      classGroup: { select: { id: true, name: true, yearGroup: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  if (students.length) {
    await db.$transaction(students.map((student) => db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "READ_PRIVATE_PROFILE",
        entityType: "Student",
        entityId: student.id,
        students: { create: { studentId: student.id } },
      },
    })));
  }
  if (!students.length) await db.auditLog.create({ data: { actorId: session.user.id, action: "READ_STUDENTS", entityType: "Student", entityId: "list" } });
  return NextResponse.json(
    students.map(({ privateProfile, ...student }) => ({
      ...student,
      privateProfile: privateProfile ? decryptPrivateData(privateProfile) : null,
    })),
  );
}

const createStudentInput = z.object({
  reference: z.string().trim().min(1).max(40),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  classGroupId: z.string().optional().or(z.literal("")),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canManageSchoolContent(session.user.role) || !(await staffAccess(session.user.id, session.user.role))?.admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = createStudentInput.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid student details" }, { status: 400 });
  if (parsed.data.classGroupId) {
    const group = await db.classGroup.findUnique({ where: { id: parsed.data.classGroupId }, select: { id: true } });
    if (!group) return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }
  const initialProfile = encryptPrivateData(JSON.stringify({
    emergencyContacts: "",
    medical: "",
    dietary: "",
  }));
  const student = await db.$transaction(async (transaction) => {
    const created = await transaction.student.create({
      data: {
        reference: parsed.data.reference,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        classGroupId: parsed.data.classGroupId || null,
        privateProfile: initialProfile,
        socialConsent: { create: { choice: "PENDING" } },
      },
      select: { id: true, reference: true, firstName: true, lastName: true },
    });
    await transaction.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "CREATE_STUDENT",
        entityType: "Student",
        entityId: created.id,
        students: { create: { studentId: created.id } },
      },
    });
    return created;
  });
  return NextResponse.json(student, { status: 201 });
}
