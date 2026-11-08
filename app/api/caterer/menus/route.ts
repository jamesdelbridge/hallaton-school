import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { mealDate, mealWeekday } from "@/lib/meals";

async function authenticate(request: Request) {
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.get("authorization") ?? "");
  if (!match) return null;
  return db.catererToken.findUnique({ where: { tokenHash: createHash("sha256").update(match[1]).digest("hex") }, select: { id: true, revokedAt: true } });
}
export async function GET(request: Request) {
  const token = await authenticate(request);
  if (!token || token.revokedAt) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await db.mealSettings.findUnique({ where: { id: "school" }, select: { periodStart: true, periodEnd: true } });
  const menus = settings ? await db.mealMenu.findMany({ where: { date: { gte: settings.periodStart, lte: settings.periodEnd } }, orderBy: { date: "asc" } }) : [];
  await db.auditLog.create({ data: { actorId: null, action: "READ_CATERER_MENUS", entityType: "CatererToken", entityId: token.id } });
  return NextResponse.json({ settings, menus }, { headers: { "Cache-Control": "no-store" } });
}
export async function PUT(request: Request) {
  const token = await authenticate(request);
  if (!token || token.revokedAt) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z.object({ menus: z.array(z.object({ date: mealDate, menu: z.string().trim().min(1).max(5000) })).min(1).max(31).refine((value) => new Set(value.map((item) => item.date)).size === value.length) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid menus." }, { status: 400 });
  try {
    const result = await db.$transaction(async (tx) => {
      const current = await tx.catererToken.findUnique({ where: { id: token.id }, select: { revokedAt: true } });
      if (!current || current.revokedAt) return "unauthorized";
      const settings = await tx.mealSettings.findUnique({ where: { id: "school" } });
      if (!settings || parsed.data.menus.some((item) => item.date < settings.periodStart || item.date > settings.periodEnd || ![1, 2, 3, 4, 5].includes(mealWeekday(item.date)))) return "invalid";
      for (const item of [...parsed.data.menus].sort((a, b) => a.date.localeCompare(b.date))) await tx.mealMenu.upsert({ where: { date: item.date }, create: item, update: { menu: item.menu } });
      await tx.auditLog.create({ data: { actorId: null, action: "SAVE_CATERER_MENUS", entityType: "CatererToken", entityId: token.id } });
      return "ok";
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (result !== "ok") return NextResponse.json({ error: result === "unauthorized" ? "Unauthorized" : "Choose weekdays within the configured meal period." }, { status: result === "unauthorized" ? 401 : 400 });
    return NextResponse.json({ saved: parsed.data.menus.length });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "The planner changed concurrently; retry." }, { status: 409 });
    throw error;
  }
}
