import { Prisma, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { activeEnquiryRole } from "@/lib/enquiry-access";

const input = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  studentIds: z.array(z.string().min(1)).max(100),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== Role.SUPER_ADMIN || !(await activeEnquiryRole(session.user.id, session.user.role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid parent account details." }, { status: 400 });
  const { id } = await params;
  const studentIds = [...new Set(parsed.data.studentIds)];
  try {
    const result = await db.$transaction(async (tx) => {
      const parent = await tx.user.findUnique({ where: { id }, select: { role: true, parentLinks: { select: { studentId: true } } } });
      if (!parent || parent.role !== Role.PARENT) return "missing";
      if (await tx.student.count({ where: { id: { in: studentIds } } }) !== studentIds.length) return "student";
      const oldIds = parent.parentLinks.map((link) => link.studentId);
      const removed = oldIds.filter((studentId) => !studentIds.includes(studentId));
      const added = studentIds.filter((studentId) => !oldIds.includes(studentId));
      await tx.user.update({ where: { id }, data: { name: parsed.data.name, email: parsed.data.email.toLowerCase() } });
      if (removed.length) {
        await tx.eventInvite.deleteMany({ where: { userId: id, studentId: { in: removed } } });
        await tx.parentLink.deleteMany({ where: { userId: id, studentId: { in: removed } } });
      }
      if (added.length) await tx.parentLink.createMany({ data: added.map((studentId) => ({ studentId, userId: id })) });
      await tx.auditLog.create({ data: { actorId: session.user.id, action: "UPDATE_PARENT_ACCOUNT", entityType: "User", entityId: id, students: { create: [...new Set([...oldIds, ...studentIds])].map((studentId) => ({ studentId })) } } });
      return "updated";
    });
    if (result === "missing") return NextResponse.json({ error: "Parent account not found." }, { status: 404 });
    if (result === "student") return NextResponse.json({ error: "A selected student no longer exists." }, { status: 400 });
    return NextResponse.json({ saved: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "That email is already used by another account." }, { status: 409 });
    throw error;
  }
}
