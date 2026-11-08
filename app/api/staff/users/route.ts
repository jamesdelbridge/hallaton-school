import { Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { activeEnquiryRole } from "@/lib/enquiry-access";

const userInput = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(14).max(72),
  role: z.nativeEnum(Role),
  studentIds: z.array(z.string()).max(100).default([]),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== Role.SUPER_ADMIN || !(await activeEnquiryRole(session.user.id, session.user.role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      sportsCoordinator: true,
      safeguardingLead: true,
      classAssignments: { select: { classGroupId: true } },
      createdAt: true,
      parentLinks: { select: { studentId: true } },
      _count: { select: { parentLinks: true } },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
  await db.auditLog.create({ data: { actorId: session.user.id, action: "READ_ACCOUNTS", entityType: "User", entityId: "list" } });
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== Role.SUPER_ADMIN || !(await activeEnquiryRole(session.user.id, session.user.role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = userInput.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid account details" }, { status: 400 });
  if (parsed.data.role !== Role.PARENT && parsed.data.studentIds.length) {
    return NextResponse.json({ error: "Only parent accounts can be linked to students" }, { status: 400 });
  }
  const studentCount = await db.student.count({ where: { id: { in: parsed.data.studentIds } } });
  if (studentCount !== parsed.data.studentIds.length) {
    return NextResponse.json({ error: "One or more students could not be found" }, { status: 404 });
  }
  const passwordHash = await hash(parsed.data.password, 12);
  const user = await db.$transaction(async (transaction) => {
    const created = await transaction.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash,
        role: parsed.data.role,
        parentLinks: {
          create: parsed.data.studentIds.map((studentId) => ({ studentId })),
        },
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    await transaction.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "CREATE_USER",
        entityType: "User",
        entityId: created.id,
        students: { create: parsed.data.studentIds.map((studentId) => ({ studentId })) },
      },
    });
    return created;
  });
  return NextResponse.json(user, { status: 201 });
}
