import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { encryptPrivateData } from "@/lib/encryption";
import { canManageProfiles } from "@/lib/permissions";
import { staffAccess } from "@/lib/staff-access";

const profileInput = z.object({
  emergencyContacts: z.string().max(5_000),
  medical: z.string().max(5_000),
  dietary: z.string().max(5_000),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canManageProfiles(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const access = await staffAccess(session.user.id, session.user.role);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = profileInput.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid profile details" }, { status: 400 });
  const { id } = await params;
  const student = await db.student.findUnique({
    where: { id },
    select: { id: true, classGroupId: true },
  });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  if (!access.admin && !access.safeguarding && (!student.classGroupId || !access.classIds.includes(student.classGroupId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const privateProfile = encryptPrivateData(JSON.stringify(parsed.data));
  await db.$transaction(async (transaction) => {
    await transaction.student.update({
      where: { id },
      data: { privateProfile },
    });
    await transaction.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "UPDATE_PRIVATE_PROFILE",
        entityType: "Student",
        entityId: id,
        students: { create: { studentId: id } },
      },
    });
  });
  return NextResponse.json({ saved: true });
}
