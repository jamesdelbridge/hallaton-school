import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { staffAccess } from "@/lib/staff-access";

export async function GET() {
  const session = await getServerSession(authOptions);
  const access = session?.user && await staffAccess(session.user.id, session.user.role);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(access, { headers: { "Cache-Control": "private, no-store" } });
}
