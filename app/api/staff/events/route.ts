import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageSchoolContent } from "@/lib/permissions";
import { activeEnquiryRole } from "@/lib/enquiry-access";
import { staffAccess } from "@/lib/staff-access";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await activeEnquiryRole(session.user.id, session.user.role))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (session.user.role === Role.PARENT) {
    const invites = await db.eventInvite.findMany({
      where: { userId: session.user.id, event: { approved: true }, student: { parentLinks: { some: { userId: session.user.id } } } },
      select: {
        id: true,
        status: true,
        student: { select: { firstName: true, lastName: true } },
        event: {
          select: {
            id: true,
            title: true,
            description: true,
            startsAt: true,
            endsAt: true,
            meetingInfo: true,
            gearList: true,
          },
        },
      },
      orderBy: { event: { startsAt: "asc" } },
    });
    return NextResponse.json(invites);
  }
  if (!canManageSchoolContent(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const access = await staffAccess(session.user.id, session.user.role);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const events = await db.schoolEvent.findMany({
    where: access.admin ? {} : { OR: [{ createdById: session.user.id }, ...(access.sports ? [{ category: "SPORTS" }] : [])] },
    select: {
      id: true,
      title: true,
      description: true,
      startsAt: true,
      endsAt: true,
      meetingInfo: true,
      gearList: true,
      published: true,
      _count: { select: { invites: true } },
    },
    orderBy: { startsAt: "desc" },
    take: 30,
  });
  await db.auditLog.create({ data: { actorId: session.user.id, action: "READ_EVENTS", entityType: "SchoolEvent", entityId: "list" } });
  return NextResponse.json(events);
}
