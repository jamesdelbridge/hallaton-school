import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { staffAccess } from "@/lib/staff-access";

export async function GET() {
  const session = await getServerSession(authOptions);
  const access = session?.user && await staffAccess(session.user.id, session.user.role);
  if (!session?.user || !access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const students = await db.student.findMany({
    select: { id: true, firstName: true, lastName: true, reference: true, classGroup: { select: { id: true, name: true, yearGroup: true } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  await db.auditLog.create({ data: { actorId: session.user.id, action: "READ_STUDENT_ROSTER", entityType: "Student", entityId: "list" } });
  return NextResponse.json(students);
}
