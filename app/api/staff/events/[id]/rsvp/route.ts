import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { activeEnquiryRole } from "@/lib/enquiry-access";

const input = z.object({ status: z.enum(["ACCEPTED", "DECLINED"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PARENT" || !(await activeEnquiryRole(session.user.id, session.user.role))) {
    return NextResponse.json({ error: "Only invited parents can RSVP here" }, { status: 403 });
  }
  const parsed = input.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid RSVP" }, { status: 400 });
  const { id } = await params;
  const updated = await db.eventInvite.updateMany({
    where: { id, userId: session.user.id, event: { approved: true }, user: { active: true, role: "PARENT" }, student: { parentLinks: { some: { userId: session.user.id } } } },
    data: { status: parsed.data.status },
  });
  if (!updated.count) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  return NextResponse.json({ status: parsed.data.status });
}
