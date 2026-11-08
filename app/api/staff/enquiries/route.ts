import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { decryptPrivateData } from "@/lib/encryption";
import { enquiryAccess } from "@/lib/enquiry-access";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(await enquiryAccess(session.user.id, session.user.role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const [enquiries, students, settings] = await Promise.all([db.contactEnquiry.findMany({
    orderBy: { createdAt: "desc" },
    include: { contact: true, parent: { select: { id: true, name: true } }, students: { select: { studentId: true } }, shares: { select: { userId: true, studentId: true } }, reviews: { orderBy: { createdAt: "desc" }, select: { id: true, createdAt: true, encryptedDecision: true, reviewer: { select: { name: true } } } } },
  }), db.student.findMany({
    select: { id: true, firstName: true, lastName: true, reference: true, parentLinks: { where: { user: { role: "PARENT", active: true } }, select: { user: { select: { id: true, name: true, email: true } } } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  }), db.enquirySettings.findUnique({ where: { id: "school" }, select: { reviewAfterDays: true } })]);
  if (enquiries.length) {
    await db.$transaction(enquiries.map((enquiry) => db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "READ_CONTACT_ENQUIRY",
        entityType: "ContactEnquiry",
        entityId: enquiry.id,
        students: { create: enquiry.students.map(({ studentId }) => ({ studentId })) },
      },
    })));
  }
  if (!enquiries.length) await db.auditLog.create({ data: { actorId: session.user.id, action: "READ_ENQUIRIES", entityType: "ContactEnquiry", entityId: "list" } });
  return NextResponse.json({ enquiries: enquiries.map(({ encryptedBody, reviews, ...enquiry }) => ({
    ...enquiry,
    message: decryptPrivateData(encryptedBody),
    reviews: reviews.map(({ encryptedDecision, ...review }) => ({ ...review, decision: decryptPrivateData(encryptedDecision) })),
    reviewDue: settings?.reviewAfterDays != null && Date.now() >= (enquiry.reviewedAt ?? enquiry.createdAt).getTime() + settings.reviewAfterDays * 86400000,
  })), students, reviewAfterDays: settings?.reviewAfterDays ?? null }, { headers: { "Cache-Control": "no-store" } });
}
