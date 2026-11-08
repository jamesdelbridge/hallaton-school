import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { decryptPrivateData } from "@/lib/encryption";
import { staffAccess } from "@/lib/staff-access";

const updateInput = z.object({ status: z.enum(["OPEN", "REVIEWING", "RESOLVED"]) });

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(await staffAccess(session.user.id, session.user.role))?.lead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const concern = await db.safeguardingConcern.findUnique({
    where: { id },
    select: { id: true, studentId: true, encryptedBody: true, status: true, createdAt: true },
  });
  if (!concern) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "READ_CONFIDENTIAL",
      entityType: "SafeguardingConcern",
      entityId: concern.id,
      students: { create: { studentId: concern.studentId } },
    },
  });
  const { encryptedBody, ...metadata } = concern;
  return NextResponse.json({ ...metadata, details: decryptPrivateData(encryptedBody) });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(await staffAccess(session.user.id, session.user.role))?.lead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = updateInput.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const { id } = await params;
  const existing = await db.safeguardingConcern.findUnique({
    where: { id },
    select: { id: true, studentId: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await db.$transaction(async (transaction) => {
    const concern = await transaction.safeguardingConcern.update({
      where: { id },
      data: { status: parsed.data.status },
      select: { id: true, status: true, updatedAt: true },
    });
    await transaction.auditLog.create({
      data: {
        actorId: session.user.id,
        action: `STATUS_${parsed.data.status}`,
        entityType: "SafeguardingConcern",
        entityId: concern.id,
        students: { create: { studentId: existing.studentId } },
      },
    });
    return concern;
  });
  return NextResponse.json(updated);
}
