import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

loadEnvConfig(process.cwd());
const url = new URL(process.env.DATABASE_URL ?? "");
if (url.pathname !== "/hallaton_copilot_demo" || !["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname)) throw new Error("Demo seeding is permitted only on the local hallaton_copilot_demo database.");
if (process.env.CONFIRM_DEMO_SEED !== "fictional-data-only") throw new Error("Set CONFIRM_DEMO_SEED=fictional-data-only to confirm.");

const db = new PrismaClient();
const day = (date: Date) => date.toISOString().slice(0, 10);
const start = new Date();
start.setUTCHours(12, 0, 0, 0);
start.setUTCDate(start.getUTCDate() + 8);
start.setUTCDate(start.getUTCDate() + ((1 - start.getUTCDay() + 7) % 7));
const end = new Date(start);
end.setUTCDate(end.getUTCDate() + 11);
const menu = ["Fictional demo: vegetable pasta", "Fictional demo: jacket potato", "Fictional demo: rice and vegetables", "Fictional demo: vegetable wraps", "Fictional demo: tomato pasta"];

async function main() {
  const result = await db.$transaction(async (tx) => {
    if (await tx.mealSettings.findUnique({ where: { id: "school" } })) return "existing";
    if (!(await tx.user.findUnique({ where: { id: "showcase-2026-admin" }, select: { id: true } }))) throw new Error("Run the showcase account seed first.");
    const dates = menu.map((_, index) => {
      const current = new Date(start);
      current.setUTCDate(current.getUTCDate() + index);
      return day(current);
    });
    if (await tx.mealMenu.count({ where: { date: { in: dates } } })) throw new Error("A proposed menu date already has data; no meal records were changed.");
    await tx.mealSettings.create({ data: { id: "school", periodStart: day(start), periodEnd: day(end), pricePence: 300, cutoffDays: 1, cutoffTime: "12:00" } });
    await tx.mealMenu.createMany({ data: dates.map((date, index) => ({ date, menu: menu[index] })) });
    await tx.auditLog.create({ data: { actorId: "showcase-2026-admin", action: "CREATE_DEMO_MEALS", entityType: "MealPlanner", entityId: "school" } });
    return "created";
  });
  console.log(result === "existing" ? "Meal settings already exist; no meal records were changed." : "Fictional demo meal period and five menus created.");
}

main().finally(() => db.$disconnect());
