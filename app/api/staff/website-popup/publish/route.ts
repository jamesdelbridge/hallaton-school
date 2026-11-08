import { Prisma, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { activeEnquiryRole } from "@/lib/enquiry-access";
import { publishPopup, WebsitePublishConflict } from "@/lib/website-publish";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== Role.SUPER_ADMIN || !(await activeEnquiryRole(session.user.id, session.user.role))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z.object({ updatedAt: z.iso.datetime() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Reload the draft before publishing." }, { status: 400 });
  const result = await db.$transaction(async (tx) => {
    const change = await publishPopup(tx, parsed.data.updatedAt);
    await tx.auditLog.create({ data: { actorId: session.user.id, action: "PUBLISH_WEBSITE_POPUP", entityType: "WebsitePopup", entityId: "school", ...change } });
    return true;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }).catch((error: unknown) => { if (error instanceof WebsitePublishConflict || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")) return false; throw error; });
  if (!result) return NextResponse.json({ error: "Draft or live popup changed since you loaded it. Review before publishing." }, { status: 409 });
  return NextResponse.json({ published: true });
}
