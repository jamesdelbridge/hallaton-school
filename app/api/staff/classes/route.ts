import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageProfiles, canManageSchoolContent } from "@/lib/permissions";
import { staffAccess } from "@/lib/staff-access";

const classInput = z.object({
  name: z.string().trim().min(1).max(80),
  yearGroup: z.string().trim().min(1).max(40),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canManageProfiles(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const access = await staffAccess(session.user.id, session.user.role);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const classes = await db.classGroup.findMany({
    where: access.admin || access.safeguarding ? {} : { id: { in: access.classIds } },
    select: { id: true, name: true, yearGroup: true, _count: { select: { students: true } } },
    orderBy: [{ yearGroup: "asc" }, { name: "asc" }],
  });
  await db.auditLog.create({ data: { actorId: session.user.id, action: "READ_CLASSES", entityType: "ClassGroup", entityId: "list" } });
  return NextResponse.json(classes);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canManageSchoolContent(session.user.role) || !(await staffAccess(session.user.id, session.user.role))?.admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = classInput.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid class details" }, { status: 400 });
  const group = await db.$transaction(async (tx) => {
    const created = await tx.classGroup.create({ data: parsed.data });
    await tx.auditLog.create({ data: { actorId: session.user.id, action: "CREATE_CLASS", entityType: "ClassGroup", entityId: created.id } });
    return created;
  });
  return NextResponse.json(group, { status: 201 });
}
