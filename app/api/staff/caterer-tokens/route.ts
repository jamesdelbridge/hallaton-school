import { createHash, randomBytes } from "node:crypto";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { activeEnquiryRole } from "@/lib/enquiry-access";
import { db } from "@/lib/db";

async function admin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === Role.SUPER_ADMIN && await activeEnquiryRole(session.user.id, session.user.role) ? session.user : null;
}
export async function GET() {
  const user = await admin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tokens = await db.catererToken.findMany({ select: { id: true, name: true, createdAt: true, revokedAt: true }, orderBy: { createdAt: "desc" } });
  await db.auditLog.create({ data: { actorId: user.id, action: "READ_CATERER_TOKENS", entityType: "CatererToken", entityId: "list" } });
  return NextResponse.json(tokens, { headers: { "Cache-Control": "private, no-store" } });
}
export async function POST(request: Request) {
  const user = await admin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z.object({ name: z.string().trim().min(2).max(100) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a caterer name." }, { status: 400 });
  const token = randomBytes(32).toString("base64url");
  await db.$transaction(async (tx) => {
    const row = await tx.catererToken.create({ data: { name: parsed.data.name, tokenHash: createHash("sha256").update(token).digest("hex") } });
    await tx.auditLog.create({ data: { actorId: user.id, action: "CREATE_CATERER_TOKEN", entityType: "CatererToken", entityId: row.id } });
  });
  return NextResponse.json({ token }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
export async function DELETE(request: Request) {
  const user = await admin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z.object({ id: z.string().min(1) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid credential." }, { status: 400 });
  const count = await db.$transaction(async (tx) => {
    const row = await tx.catererToken.updateMany({ where: { id: parsed.data.id, revokedAt: null }, data: { revokedAt: new Date() } });
    if (row.count) await tx.auditLog.create({ data: { actorId: user.id, action: "REVOKE_CATERER_TOKEN", entityType: "CatererToken", entityId: parsed.data.id } });
    return row.count;
  });
  return count ? NextResponse.json({ revoked: true }) : NextResponse.json({ error: "Credential not found or already revoked." }, { status: 404 });
}
