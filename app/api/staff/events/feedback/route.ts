import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { staffAccess } from "@/lib/staff-access";
import { decryptPrivateData, encryptPrivateData } from "@/lib/encryption";

const input = z.object({ eventId: z.string().min(1), studentId: z.string().min(1), feedback: z.string().trim().min(1).max(5000) });

export async function GET() {
  const session = await getServerSession(authOptions);
  const access = session?.user && await staffAccess(session.user.id, session.user.role);
  if (!session?.user || !access || (!access.admin && !access.sports)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const entries = await db.eventFeedback.findMany({ where: { event: { category: "SPORTS" } }, select: { id: true, encryptedBody: true, createdAt: true, studentId: true, event: { select: { title: true } }, student: { select: { firstName: true, lastName: true } }, author: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  await db.auditLog.create({ data: { actorId: session.user.id, action: "READ_EVENT_FEEDBACK", entityType: "EventFeedback", entityId: "list", students: { create: [...new Set(entries.map((entry) => entry.studentId))].map((studentId) => ({ studentId })) } } });
  return NextResponse.json(entries.map(({ encryptedBody, ...entry }) => ({ ...entry, feedback: decryptPrivateData(encryptedBody) })), { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const access = session?.user && await staffAccess(session.user.id, session.user.role);
  if (!session?.user || !access || (!access.admin && !access.sports)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid event feedback." }, { status: 400 });
  const { eventId, studentId, feedback } = parsed.data;
  const result = await db.$transaction(async (tx) => {
    const invite = await tx.eventInvite.findFirst({ where: { eventId, studentId, event: { approved: true, category: "SPORTS" } }, select: { id: true } });
    if (!invite) return null;
    const entry = await tx.eventFeedback.create({ data: { eventId, studentId, authorId: session.user.id, encryptedBody: encryptPrivateData(feedback) } });
    await tx.auditLog.create({ data: { actorId: session.user.id, action: "CREATE_EVENT_FEEDBACK", entityType: "EventFeedback", entityId: entry.id, students: { create: { studentId } } } });
    return entry.id;
  });
  if (!result) return NextResponse.json({ error: "The pupil must be invited to an approved event." }, { status: 400 });
  return NextResponse.json({ saved: true }, { status: 201 });
}
