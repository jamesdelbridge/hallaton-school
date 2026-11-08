import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { activeEnquiryRole, enquiryAccess } from "@/lib/enquiry-access";
import { encryptPrivateData } from "@/lib/encryption";

const updateInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("link"), studentIds: z.array(z.string().min(1)).max(100), shares: z.array(z.object({ studentId: z.string().min(1), userId: z.string().min(1) })).max(200) }),
  z.object({ action: z.literal("review"), decision: z.string().trim().min(10).max(2000) }),
]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(await enquiryAccess(session.user.id, session.user.role))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = updateInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid enquiry update." }, { status: 400 });
  const { id } = await params;
  const enquiry = await db.contactEnquiry.findUnique({ where: { id }, select: { id: true, students: { select: { studentId: true } } } });
  if (!enquiry) return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });
  const data = parsed.data;
  if (data.action === "link") {
    const studentIds = [...new Set(data.studentIds)];
    const shares = data.shares.filter((share, index, list) => list.findIndex((other) => other.studentId === share.studentId && other.userId === share.userId) === index);
    if (shares.some((share) => !studentIds.includes(share.studentId))) {
      return NextResponse.json({ error: "Each shared parent must be linked to a selected student." }, { status: 400 });
    }

    const [studentCount, parentLinks] = await Promise.all([
      db.student.count({ where: { id: { in: studentIds } } }),
      db.parentLink.findMany({ where: { studentId: { in: studentIds }, user: { role: "PARENT", active: true } }, select: { id: true, studentId: true, userId: true } }),
    ]);
    if (studentCount !== studentIds.length || shares.some((share) => !parentLinks.some((link) => link.studentId === share.studentId && link.userId === share.userId))) {
      return NextResponse.json({ error: "A student or parent link is no longer available." }, { status: 400 });
    }
    await db.$transaction(async (transaction) => {
      await transaction.enquiryShare.deleteMany({ where: { enquiryId: id } });
      await transaction.enquiryStudent.deleteMany({ where: { enquiryId: id } });
      if (studentIds.length) await transaction.enquiryStudent.createMany({ data: studentIds.map((studentId) => ({ enquiryId: id, studentId })) });
      if (shares.length) await transaction.enquiryShare.createMany({ data: shares.map((share) => ({ enquiryId: id, ...share, parentLinkId: parentLinks.find((link) => link.studentId === share.studentId && link.userId === share.userId)!.id })) });
      await transaction.auditLog.create({ data: { actorId: session.user.id, action: "UPDATE_ENQUIRY_LINKS", entityType: "ContactEnquiry", entityId: id, students: { create: [...new Set([...enquiry.students.map((item) => item.studentId), ...studentIds])].map((studentId) => ({ studentId })) } } });
    });
  } else {
    await db.$transaction(async (transaction) => {
      await transaction.contactEnquiry.update({ where: { id }, data: { reviewedAt: new Date() } });
      await transaction.enquiryReview.create({ data: { enquiryId: id, reviewerId: session.user.id, encryptedDecision: encryptPrivateData(data.decision) } });
      await transaction.auditLog.create({ data: { actorId: session.user.id, action: "REVIEW_ENQUIRY_RETENTION", entityType: "ContactEnquiry", entityId: id, students: { create: enquiry.students.map(({ studentId }) => ({ studentId })) } } });
    });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== Role.SUPER_ADMIN || !(await activeEnquiryRole(session.user.id, session.user.role))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z.object({ justification: z.string().trim().min(10).max(2000) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "A deletion justification is required." }, { status: 400 });
  const { id } = await params;
  const result = await db.$transaction(async (transaction) => {
    const enquiry = await transaction.contactEnquiry.findUnique({ where: { id }, select: { contactId: true, students: { select: { studentId: true } }, reviews: { orderBy: { createdAt: "desc" }, take: 1, select: { encryptedDecision: true } } } });
    if (!enquiry) return "missing";
    if (!enquiry.reviews.length) return "review";
    await transaction.enquiryDeletion.create({ data: { enquiryId: id, authorisedById: session.user.id, encryptedJustification: encryptPrivateData(parsed.data.justification), encryptedReview: enquiry.reviews[0].encryptedDecision } });
    await transaction.auditLog.create({ data: { actorId: session.user.id, action: "DELETE_CONTACT_ENQUIRY", entityType: "ContactEnquiry", entityId: id, students: { create: enquiry.students.map(({ studentId }) => ({ studentId })) } } });
    await transaction.contactEnquiry.delete({ where: { id } });
    if (!(await transaction.contactEnquiry.count({ where: { contactId: enquiry.contactId } }))) {
      await transaction.enquiryContact.delete({ where: { id: enquiry.contactId } });
    }
    return "deleted";
  });
  if (result === "missing") return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });
  if (result === "review") return NextResponse.json({ error: "Record a retention review before deletion." }, { status: 400 });
  return NextResponse.json({ success: true });
}
