import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { activeEnquiryRole } from "@/lib/enquiry-access";

const settingsInput = z.object({
  notificationEmail: z.union([z.literal(""), z.string().trim().email().max(254)]),
  teacherAccess: z.boolean(),
  safeguardingLeadAccess: z.boolean(),
  reviewAfterDays: z.number().int().min(1).max(36500).nullable(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== Role.SUPER_ADMIN || !(await activeEnquiryRole(session.user.id, session.user.role))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const settings = await db.enquirySettings.findUnique({ where: { id: "school" } });
  await db.auditLog.create({ data: { actorId: session.user.id, action: "READ_ENQUIRY_SETTINGS", entityType: "EnquirySettings", entityId: "school" } });
  return NextResponse.json(settings ?? { notificationEmail: null, teacherAccess: true, safeguardingLeadAccess: false, reviewAfterDays: null }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== Role.SUPER_ADMIN || !(await activeEnquiryRole(session.user.id, session.user.role))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = settingsInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid inbox settings." }, { status: 400 });
  const data = { ...parsed.data, notificationEmail: parsed.data.notificationEmail.toLowerCase() || null };
  await db.$transaction(async (transaction) => {
    await transaction.enquirySettings.upsert({ where: { id: "school" }, create: { id: "school", ...data }, update: data });
    await transaction.auditLog.create({ data: { actorId: session.user.id, action: "UPDATE_ENQUIRY_SETTINGS", entityType: "EnquirySettings", entityId: "school" } });
  });
  return NextResponse.json({ success: true });
}
