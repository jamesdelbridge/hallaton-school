import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { decryptPrivateData } from "@/lib/encryption";
import { activeEnquiryRole } from "@/lib/enquiry-access";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== Role.PARENT || !(await activeEnquiryRole(session.user.id, session.user.role))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const userId = session.user.id;
  const shares = await db.enquiryShare.findMany({
    where: { userId, parentLink: { userId }, student: { enquiries: { some: {} } } },
    select: { student: { select: { id: true, firstName: true, lastName: true } }, enquiry: { select: { id: true, senderName: true, encryptedBody: true, createdAt: true, students: { select: { studentId: true } } } } },
  });
  const permitted = shares.filter((share) => share.enquiry.students.some((student) => student.studentId === share.student.id));
  if (permitted.length) await db.auditLog.createMany({ data: permitted.map(({ enquiry }) => ({ actorId: userId, action: "READ_SHARED_ENQUIRY", entityType: "ContactEnquiry", entityId: enquiry.id })) });
  return NextResponse.json(permitted.map(({ student, enquiry }) => ({
    id: `${enquiry.id}:${student.id}`, student, senderName: enquiry.senderName, createdAt: enquiry.createdAt, message: decryptPrivateData(enquiry.encryptedBody),
  })), { headers: { "Cache-Control": "no-store" } });
}
