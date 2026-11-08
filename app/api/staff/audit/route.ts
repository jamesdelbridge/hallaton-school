import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { activeEnquiryRole } from "@/lib/enquiry-access";
import { staffAccess } from "@/lib/staff-access";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(await activeEnquiryRole(session.user.id, session.user.role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const access = await staffAccess(session.user.id, session.user.role);
  if (!access || (!access.admin && !access.lead)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const search = new URL(request.url).searchParams;
  const studentId = search.get("studentId");
  const cursor = search.get("cursor");
  if (cursor && !(await db.auditLog.findUnique({ where: { id: cursor }, select: { id: true } }))) return NextResponse.json({ error: "Invalid audit cursor." }, { status: 400 });
  const logs = await db.auditLog.findMany({
    where: {
      entityType: session.user.role === Role.SUPER_ADMIN ? { not: "SafeguardingConcern" } : "SafeguardingConcern",
      ...(studentId ? { students: { some: { studentId } } } : {}),
    },
    select: { id: true, action: true, entityType: true, entityId: true, occurredAt: true, beforeText: session.user.role === Role.SUPER_ADMIN, afterText: session.user.role === Role.SUPER_ADMIN, actor: { select: { name: true, role: true } }, students: { select: { student: { select: { firstName: true, lastName: true, reference: true } } } } },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: 200,
  });
  await db.auditLog.create({ data: { actorId: session.user.id, action: "READ_AUDIT_TRAIL", entityType: "AuditLog", entityId: "list", ...(studentId && await db.student.findUnique({ where: { id: studentId }, select: { id: true } }) ? { students: { create: { studentId } } } : {}) } });
  return NextResponse.json(logs, { headers: { "Cache-Control": "no-store" } });
}
