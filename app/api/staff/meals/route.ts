import { Prisma, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { activeEnquiryRole } from "@/lib/enquiry-access";
import { db } from "@/lib/db";
import { mealDate, mealSettingsInput, mealWeekday } from "@/lib/meals";

async function staff() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== Role.SUPER_ADMIN && session.user.role !== Role.TEACHER) || !(await activeEnquiryRole(session.user.id, session.user.role))) return null;
  return session.user;
}

export async function GET() {
  const user = await staff();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const settings = await db.mealSettings.findUnique({ where: { id: "school" } });
  const [menus, plans, exceptions] = settings ? await Promise.all([
    db.mealMenu.findMany({ where: { date: { gte: settings.periodStart, lte: settings.periodEnd } }, orderBy: { date: "asc" } }),
    db.mealPlan.findMany({ where: { periodStart: settings.periodStart }, select: { studentId: true, weekdays: true, student: { select: { firstName: true, lastName: true, reference: true } } } }),
    db.mealException.findMany({ where: { date: { gte: settings.periodStart, lte: settings.periodEnd }, packed: true }, select: { studentId: true, date: true } }),
  ]) : [[], [], []];
  const dates = [...new Set([...menus.map((menu) => menu.date), ...exceptions.map((exception) => exception.date)])].sort();
  const rows = dates.map((date) => {
    const booked = plans.filter((plan) => plan.weekdays.includes(mealWeekday(date)));
    const packed = booked.filter((plan) => exceptions.some((item) => item.date === date && item.studentId === plan.studentId));
    return { date, menu: menus.find((menu) => menu.date === date)?.menu ?? "Menu not yet added", schoolMeals: booked.length - packed.length, packedLunches: packed.length, packedStudents: packed.map((plan) => plan.student) };
  });
  await db.auditLog.create({ data: { actorId: user.id, action: "READ_MEAL_PLANNER", entityType: "MealPlanner", entityId: "school", students: { create: plans.map(({ studentId }) => ({ studentId })) } } });
  return NextResponse.json({ settings, menus: rows }, { headers: { "Cache-Control": "private, no-store" } });
}

const input = z.discriminatedUnion("type", [
  z.object({ type: z.literal("settings"), settings: mealSettingsInput }),
  z.object({ type: z.literal("menu"), date: mealDate, menu: z.string().trim().min(1).max(5000) }),
]);
export async function POST(request: Request) {
  const user = await staff();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid meal settings or menu." }, { status: 400 });
  if (parsed.data.type === "settings" && user.role !== Role.SUPER_ADMIN) return NextResponse.json({ error: "Only an administrator can change meal settings." }, { status: 403 });
  const data = parsed.data;
  try {
    const result = await db.$transaction(async (tx) => {
      if (data.type === "settings") {
        const previous = await tx.mealSettings.findUnique({ where: { id: "school" } });
        if (previous && await tx.mealPlan.count({ where: { periodStart: previous.periodStart } }) &&
          (previous.periodStart === data.settings.periodStart
            ? previous.periodEnd !== data.settings.periodEnd || previous.pricePence !== data.settings.pricePence
            : data.settings.periodStart <= previous.periodEnd)) return false;
        await tx.mealSettings.upsert({ where: { id: "school" }, create: data.settings, update: data.settings });
      } else {
        const settings = await tx.mealSettings.findUnique({ where: { id: "school" } });
        if (!settings || data.date < settings.periodStart || data.date > settings.periodEnd || ![1, 2, 3, 4, 5].includes(mealWeekday(data.date))) return false;
        await tx.mealMenu.upsert({ where: { date: data.date }, create: { date: data.date, menu: data.menu }, update: { menu: data.menu } });
      }
      await tx.auditLog.create({ data: { actorId: user.id, action: data.type === "settings" ? "SAVE_MEAL_SETTINGS" : "SAVE_MEAL_MENU", entityType: "MealPlanner", entityId: data.type === "settings" ? "school" : data.date } });
      return true;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (!result) return NextResponse.json({ error: data.type === "settings" ? "After families make choices, the price and end date cannot be changed. A new period must start after the previous one ends." : "Choose a weekday within the configured meal period." }, { status: 400 });
    return NextResponse.json({ saved: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "The planner changed concurrently. Reload and try again." }, { status: 409 });
    throw error;
  }
}
