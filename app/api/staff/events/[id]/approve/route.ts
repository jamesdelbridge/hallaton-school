import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { staffAccess } from "@/lib/staff-access";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(await staffAccess(session.user.id, session.user.role))?.admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const result = await db.$transaction(async (tx) => {
    const updated = await tx.schoolEvent.updateMany({ where: { id, approved: false }, data: { approved: true } });
    if (updated.count) {
      const students = await tx.eventInvite.findMany({ where: { eventId: id }, distinct: ["studentId"], select: { studentId: true } });
      await tx.auditLog.create({ data: { actorId: session.user.id, action: "APPROVE_EVENT", entityType: "SchoolEvent", entityId: id, students: { create: students } } });
    }
    return updated.count;
  });
  if (!result) return NextResponse.json({ error: "Draft event not found or already approved." }, { status: 404 });
  return NextResponse.json({ approved: true });
}
