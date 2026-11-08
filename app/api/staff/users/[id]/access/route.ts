import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { staffAccess } from "@/lib/staff-access";

const input = z.object({ classIds: z.array(z.string().min(1)).max(100), sports: z.boolean(), safeguardingLead: z.boolean() });

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(await staffAccess(session.user.id, session.user.role))?.admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid staff access settings." }, { status: 400 });
  const { id } = await params;
  const classIds = [...new Set(parsed.data.classIds)];
  const result = await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id }, select: { role: true } });
    if (!user || user.role !== Role.TEACHER) return "user";
    if (await tx.classGroup.count({ where: { id: { in: classIds } } }) !== classIds.length) return "class";
    await tx.staffClassAssignment.deleteMany({ where: { userId: id } });
    if (classIds.length) await tx.staffClassAssignment.createMany({ data: classIds.map((classGroupId) => ({ userId: id, classGroupId })) });
    await tx.user.update({ where: { id }, data: { sportsCoordinator: parsed.data.sports, safeguardingLead: parsed.data.safeguardingLead } });
    await tx.auditLog.create({ data: { actorId: session.user.id, action: "UPDATE_STAFF_ACCESS", entityType: "User", entityId: id } });
    return "ok";
  });
  if (result !== "ok") return NextResponse.json({ error: result === "user" ? "Teacher account not found." : "A class no longer exists." }, { status: 400 });
  return NextResponse.json({ saved: true });
}
