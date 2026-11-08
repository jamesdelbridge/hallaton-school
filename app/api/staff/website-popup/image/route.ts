import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { activeEnquiryRole } from "@/lib/enquiry-access";
import { canManageSchoolContent } from "@/lib/permissions";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canManageSchoolContent(session.user.role) || !(await activeEnquiryRole(session.user.id, session.user.role))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const popup = await db.websitePopup.findUnique({ where: { id: "draft" }, select: { image: true, imageType: true } });
  if (!popup) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return new NextResponse(new Uint8Array(popup.image), { headers: { "Content-Type": popup.imageType, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
