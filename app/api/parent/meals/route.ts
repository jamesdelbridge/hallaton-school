import { Role, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { activeEnquiryRole } from "@/lib/enquiry-access";
import { mealChangeOpen, mealDate, mealWeekday } from "@/lib/meals";

async function parent() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== Role.PARENT || !(await activeEnquiryRole(session.user.id, session.user.role))) return null;
  return session.user;
}

export async function GET() {
  const user = await parent();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [settings, links] = await Promise.all([
    db.mealSettings.findUnique({ where: { id: "school" } }),
    db.parentLink.findMany({ where: { userId: user.id }, select: { student: { select: { id: true, firstName: true, lastName: true, classGroup: { select: { name: true, yearGroup: true } }, mealPlans: true, mealExceptions: true } } } }),
  ]);
  const menus = settings ? await db.mealMenu.findMany({ where: { date: { gte: settings.periodStart, lte: settings.periodEnd } }, orderBy: { date: "asc" } }) : [];
  return NextResponse.json({ settings, students: links.map(({ student }) => ({ ...student, mealPlans: student.mealPlans.filter((plan) => plan.periodStart === settings?.periodStart), mealExceptions: student.mealExceptions.filter((entry) => entry.date >= (settings?.periodStart ?? "") && entry.date <= (settings?.periodEnd ?? "")) })), menus }, { headers: { "Cache-Control": "private, no-store" } });
}

const input = z.discriminatedUnion("type", [
  z.object({ type: z.literal("plan"), studentId: z.string().min(1), weekdays: z.array(z.number().int().min(1).max(5)).max(5).refine((value) => new Set(value).size === value.length), version: z.iso.datetime().nullable() }),
  z.object({ type: z.literal("exception"), studentId: z.string().min(1), date: mealDate, packed: z.boolean(), version: z.iso.datetime().nullable() }),
]);

export async function POST(request: Request) {
  const user = await parent();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid meal choice." }, { status: 400 });
  const data = parsed.data;
  try {
    const outcome = await db.$transaction(async (tx) => {
      const current = await tx.user.findUnique({ where: { id: user.id }, select: { active: true, role: true } });
      if (!current?.active || current.role !== Role.PARENT || !(await tx.parentLink.findUnique({ where: { studentId_userId: { studentId: data.studentId, userId: user.id } } }))) return "forbidden";
      const settings = await tx.mealSettings.findUnique({ where: { id: "school" } });
      if (!settings) return "not-configured";
      if (data.type === "plan") {
        if (!mealChangeOpen(settings.periodStart, settings)) return "closed";
        const updated = data.version
          ? await tx.mealPlan.updateMany({ where: { studentId: data.studentId, periodStart: settings.periodStart, updatedAt: new Date(data.version) }, data: { weekdays: data.weekdays } })
          : await tx.mealPlan.createMany({ data: [{ studentId: data.studentId, periodStart: settings.periodStart, weekdays: data.weekdays }], skipDuplicates: true });
        if (!updated.count) return "conflict";
      } else {
        if (data.date < settings.periodStart || data.date > settings.periodEnd || !mealChangeOpen(data.date, settings)) return "closed";
        const plan = await tx.mealPlan.findUnique({ where: { studentId_periodStart: { studentId: data.studentId, periodStart: settings.periodStart } } });
        if (!plan?.weekdays.includes(mealWeekday(data.date))) return "not-booked";
        const updated = data.version
          ? await tx.mealException.updateMany({ where: { studentId: data.studentId, date: data.date, updatedAt: new Date(data.version) }, data: { packed: data.packed } })
          : await tx.mealException.createMany({ data: [{ studentId: data.studentId, date: data.date, packed: data.packed }], skipDuplicates: true });
        if (!updated.count) return "conflict";
      }
      await tx.auditLog.create({ data: { actorId: user.id, action: data.type === "plan" ? "SAVE_MEAL_PLAN" : "SAVE_PACKED_LUNCH", entityType: "MealChoice", entityId: data.type === "plan" ? settings.periodStart : data.date, students: { create: { studentId: data.studentId } } } });
      return "ok";
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (outcome !== "ok") return NextResponse.json({ error: outcome === "forbidden" ? "Access to this pupil is no longer available." : outcome === "conflict" ? "Another parent changed this choice. Reload and review it." : outcome === "closed" ? "The school's change deadline has passed or the date is outside the meal period." : outcome === "not-booked" ? "This day has no recurring school meal choice." : "The school has not configured meal planning." }, { status: outcome === "forbidden" ? 403 : outcome === "conflict" ? 409 : 400 });
    return NextResponse.json({ saved: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "A concurrent change occurred. Reload and try again." }, { status: 409 });
    throw error;
  }
}
