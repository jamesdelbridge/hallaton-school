import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageSchoolContent } from "@/lib/permissions";
import { activeEnquiryRole } from "@/lib/enquiry-access";
import { Prisma } from "@prisma/client";
import { formatWebsiteAudit } from "@/lib/website-audit";
import { staffAccess } from "@/lib/staff-access";

const input = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("announcement"),
    title: z.string().trim().min(3).max(120),
    body: z.string().trim().min(5).max(10_000),
    publish: z.boolean().default(false),
  }),
  z.object({
    type: z.literal("newsletter"),
    title: z.string().trim().min(3).max(120),
    issueDate: z.coerce.date(),
    publicUrl: z.string().url().refine((value) => {
      const protocol = new URL(value).protocol;
      return protocol === "https:" || protocol === "http:";
    }, "Link must use HTTP or HTTPS").optional().or(z.literal("")),
    publish: z.boolean().default(false),
  }),
  z.object({
    type: z.literal("event"),
    category: z.enum(["GENERAL", "SPORTS"]).default("GENERAL"),
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().min(5).max(10_000),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date().optional(),
    meetingInfo: z.string().max(500).optional(),
    gearList: z.string().max(2_000).optional(),
    studentIds: z.array(z.string().min(1)).max(500).default([]),
    publicTitle: z.string().trim().max(120).optional(),
    publicSummary: z.string().trim().max(2000).optional(),
    publish: z.boolean().default(false),
  }),
]);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canManageSchoolContent(session.user.role) || !(await activeEnquiryRole(session.user.id, session.user.role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const access = await staffAccess(session.user.id, session.user.role);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [announcements, newsletters, events] = await Promise.all([
    db.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    db.newsletter.findMany({ orderBy: { issueDate: "desc" }, take: 20 }),
    db.schoolEvent.findMany({ where: access.admin ? {} : { OR: [{ createdById: session.user.id }, ...(access.sports ? [{ category: "SPORTS" }] : [])] }, orderBy: { startsAt: "desc" }, take: 20, include: { invites: { select: { studentId: true, student: { select: { firstName: true, lastName: true } } } } } }),
  ]);
  await db.auditLog.create({ data: { actorId: session.user.id, action: "READ_CONTENT", entityType: "SchoolContent", entityId: "list" } });
  return NextResponse.json({ announcements, newsletters, events });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canManageSchoolContent(session.user.role) || !(await activeEnquiryRole(session.user.id, session.user.role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = input.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid content details" }, { status: 400 });
  const access = await staffAccess(session.user.id, session.user.role);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (parsed.data.publish && session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Only an administrator can publish to the website." }, { status: 403 });
  const publishDate = parsed.data.publish ? new Date() : null;
  let record: unknown;

  try {
  if (parsed.data.type === "announcement") {
    const data = parsed.data;
    record = await db.$transaction(async (tx) => {
      const created = await tx.announcement.create({
      data: {
        title: data.title,
        body: data.body,
        authorId: session.user.id,
        publishedAt: publishDate,
      },
      });
      await tx.auditLog.create({ data: { actorId: session.user.id, action: "CREATE_ANNOUNCEMENT", entityType: "Announcement", entityId: created.id, ...(data.publish ? { afterText: formatWebsiteAudit({ title: data.title, body: data.body }) } : {}) } });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } else if (parsed.data.type === "newsletter") {
    const data = parsed.data;
    record = await db.$transaction(async (tx) => {
      const created = await tx.newsletter.create({
      data: {
        title: data.title,
        issueDate: data.issueDate,
        publicUrl: data.publicUrl || null,
        publishedAt: publishDate,
      },
      });
      await tx.auditLog.create({ data: { actorId: session.user.id, action: "CREATE_NEWSLETTER", entityType: "Newsletter", entityId: created.id, ...(data.publish ? { afterText: formatWebsiteAudit({ title: data.title, issueDate: data.issueDate, publicUrl: data.publicUrl || null }) } : {}) } });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } else {
    const data = parsed.data;
    if ((data.publish || data.publicTitle || data.publicSummary) && ((data.publicTitle?.length ?? 0) < 3 || (data.publicSummary?.length ?? 0) < 5)) return NextResponse.json({ error: "A separate public title and summary are required for an event's public draft." }, { status: 400 });
    const ids = [...new Set(data.studentIds)];
    const students = await db.student.findMany({
      where: { id: { in: ids } },
      select: { id: true, classGroupId: true, parentLinks: { where: { user: { role: "PARENT", active: true } }, select: { userId: true } } },
    });
    if (students.length !== ids.length) return NextResponse.json({ error: "A selected student could not be found." }, { status: 400 });
    if (!access.admin && !(access.sports && data.category === "SPORTS") && students.some((student) => !student.classGroupId || !access.classIds.includes(student.classGroupId))) return NextResponse.json({ error: "You may invite other classes only for sports events with sports access." }, { status: 403 });
    const withoutParents = students.filter((student) => !student.parentLinks.length);
    if (withoutParents.length) return NextResponse.json({ error: "Each selected student must have an active linked parent before invitations can be created." }, { status: 400 });
    record = await db.$transaction(async (transaction) => {
      const event = await transaction.schoolEvent.create({
        data: {
          title: data.title, description: data.description, startsAt: data.startsAt, endsAt: data.endsAt,
          meetingInfo: data.meetingInfo, gearList: data.gearList, published: data.publish,
          publicTitle: data.publicTitle || null, publicSummary: data.publicSummary || null,
          approved: access.admin, createdById: session.user.id, category: data.category,
        },
      });
      const invitations = students.flatMap((student) => student.parentLinks.map(({ userId }) => ({ eventId: event.id, studentId: student.id, userId })));
      if (invitations.length) await transaction.eventInvite.createMany({ data: invitations });
      await transaction.auditLog.create({ data: { actorId: session.user.id, action: "CREATE_EVENT", entityType: "SchoolEvent", entityId: event.id, ...(data.publish ? { afterText: formatWebsiteAudit({ title: data.publicTitle, summary: data.publicSummary, startsAt: data.startsAt, endsAt: data.endsAt }) } : {}), students: { create: ids.map((studentId) => ({ studentId })) } } });
      return event;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "The website changed concurrently; reload and try again." }, { status: 409 });
    throw error;
  }
  return NextResponse.json(record, { status: 201 });
}

const inviteInput = z.object({
  eventId: z.string().min(1),
  studentIds: z.array(z.string().min(1)).min(1).max(500),
});

const publicationInput = z.object({
  type: z.enum(["announcement", "newsletter", "event"]),
  id: z.string().min(1),
  publish: z.boolean(),
  publicTitle: z.string().trim().min(3).max(120).optional(),
  publicSummary: z.string().trim().min(5).max(2000).optional(),
});

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canManageSchoolContent(session.user.role) || !(await activeEnquiryRole(session.user.id, session.user.role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = publicationInput.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid publication update" }, { status: 400 });
  const { type, id, publish } = parsed.data;
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Only an administrator can change publication." }, { status: 403 });
  const publishedAt = publish ? new Date() : null;
  if (type === "event" && publish && (!parsed.data.publicTitle || !parsed.data.publicSummary)) return NextResponse.json({ error: "Enter a separate public title and summary before publishing." }, { status: 400 });
  let count: number;
  try {
  count = await db.$transaction(async (tx) => {
    const existing = type === "announcement" ? await tx.announcement.findUnique({ where: { id }, select: { title: true, body: true, publishedAt: true } })
      : type === "newsletter" ? await tx.newsletter.findUnique({ where: { id }, select: { title: true, issueDate: true, publicUrl: true, publishedAt: true } })
        : await tx.schoolEvent.findUnique({ where: { id }, select: { approved: true, published: true, publicTitle: true, publicSummary: true, startsAt: true, endsAt: true } });
    if (!existing) return 0;
    if ("approved" in existing && publish && !existing.approved) return -1;
    const publicFields = "published" in existing
      ? { title: existing.publicTitle, summary: existing.publicSummary, startsAt: existing.startsAt, endsAt: existing.endsAt }
      : "body" in existing ? { title: existing.title, body: existing.body }
        : { title: existing.title, issueDate: existing.issueDate, publicUrl: existing.publicUrl };
    const beforeText = ("published" in existing ? existing.published : existing.publishedAt) ? formatWebsiteAudit(publicFields) : null;
    const record = type === "announcement" ? await tx.announcement.updateMany({ where: { id }, data: { publishedAt } })
      : type === "newsletter" ? await tx.newsletter.updateMany({ where: { id }, data: { publishedAt } })
        : await tx.schoolEvent.updateMany({ where: { id }, data: { published: publish, ...(publish ? { publicTitle: parsed.data.publicTitle, publicSummary: parsed.data.publicSummary } : {}) } });
    if (record.count) {
      const students = type === "event" ? await tx.eventInvite.findMany({ where: { eventId: id }, distinct: ["studentId"], select: { studentId: true } }) : [];
      const afterText = publish ? formatWebsiteAudit(type === "event" ? { title: parsed.data.publicTitle, summary: parsed.data.publicSummary, startsAt: "startsAt" in existing ? existing.startsAt : null, endsAt: "endsAt" in existing ? existing.endsAt : null } : publicFields) : null;
      await tx.auditLog.create({ data: { actorId: session.user.id, action: publish ? "PUBLISH" : "UNPUBLISH", entityType: type === "event" ? "SchoolEvent" : type === "announcement" ? "Announcement" : "Newsletter", entityId: id, beforeText, afterText, students: { create: students } } });
    }
    return record.count;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "The website changed concurrently; reload and try again." }, { status: 409 });
    throw error;
  }
  if (count === -1) return NextResponse.json({ error: "Approve the event before publishing it." }, { status: 400 });
  if (!count) return NextResponse.json({ error: "Content not found" }, { status: 404 });
  return NextResponse.json({ updated: true, published: publish });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canManageSchoolContent(session.user.role) || !(await activeEnquiryRole(session.user.id, session.user.role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = inviteInput.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid invitations" }, { status: 400 });
  const access = await staffAccess(session.user.id, session.user.role);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const event = await db.schoolEvent.findUnique({
    where: { id: parsed.data.eventId },
    select: { id: true, approved: true, createdById: true, category: true },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (!access.admin && (event.approved || event.createdById !== session.user.id)) return NextResponse.json({ error: "Only an administrator can change invitations after approval." }, { status: 403 });

  const students = await db.student.findMany({
    where: { id: { in: parsed.data.studentIds } },
    select: { id: true, classGroupId: true, parentLinks: { where: { user: { role: "PARENT", active: true } }, select: { userId: true } } },
  });
  if (students.length !== new Set(parsed.data.studentIds).size) return NextResponse.json({ error: "A selected student could not be found." }, { status: 400 });
  if (!access.admin && !(access.sports && event.category === "SPORTS") && students.some((student) => !student.classGroupId || !access.classIds.includes(student.classGroupId))) return NextResponse.json({ error: "You may invite other classes only for sports events with sports access." }, { status: 403 });
  if (students.some((student) => !student.parentLinks.length)) return NextResponse.json({ error: "Each selected student must have an active linked parent." }, { status: 400 });
  const invitations = students.flatMap((student) =>
    student.parentLinks.map(({ userId }) => ({
      eventId: event.id,
      studentId: student.id,
      userId,
    })),
  );
  let result: { count: number } | null;
  try {
  result = await db.$transaction(async (tx) => {
    if (!access.admin) {
      await tx.$queryRaw`SELECT id FROM "SchoolEvent" WHERE id = ${event.id} FOR UPDATE`;
      const current = await tx.schoolEvent.findFirst({ where: { id: event.id, approved: false, createdById: session.user.id }, select: { id: true } });
      if (!current) return null;
    }
    const created = invitations.length ? await tx.eventInvite.createMany({ data: invitations, skipDuplicates: true }) : { count: 0 };
    await tx.auditLog.create({ data: { actorId: session.user.id, action: "INVITE_FAMILIES", entityType: "SchoolEvent", entityId: event.id, students: { create: students.map(({ id }) => ({ studentId: id })) } } });
    return created;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "The event changed concurrently; reload and try again." }, { status: 409 });
    throw error;
  }
  if (!result) return NextResponse.json({ error: "Event was approved or changed; only administrators can update invitations." }, { status: 409 });
  return NextResponse.json({ invited: result.count }, { status: 201 });
}
