import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { enquiryAccess } from "@/lib/enquiry-access";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ allowed: await enquiryAccess(session.user.id, session.user.role) }, { headers: { "Cache-Control": "no-store" } });
}
