import { z } from "zod";

export const mealDate = z.iso.date().refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}, "Enter a valid calendar date.");
export const mealSettingsInput = z.object({
  periodStart: mealDate, periodEnd: mealDate,
  pricePence: z.number().int().min(0).max(100000),
  cutoffDays: z.number().int().min(0).max(30),
  cutoffTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
}).refine((value) => value.periodStart <= value.periodEnd, { message: "The end date must follow the start date." });

export function ukNow(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const part = (name: string) => parts.find((item) => item.type === name)!.value;
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function cutoffFor(date: string, days: number, time: string) {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - days);
  return `${day.toISOString().slice(0, 10)}T${time}`;
}

export function cutoffInstant(date: string, days: number, time: string) {
  const local = cutoffFor(date, days, time);
  const wall = Date.parse(`${local}:00Z`);
  const offsets = new Set([-48, -24, 0, 24, 48].map((hours) => {
    const instant = new Date(wall + hours * 3_600_000);
    return Date.parse(`${ukNow(instant)}:00Z`) - instant.getTime();
  }));
  const candidates = [...offsets].map((offset) => {
    const instant = wall - offset;
    return { instant, local: ukNow(new Date(instant)) };
  });
  const exact = candidates.filter((candidate) => candidate.local === local);
  if (exact.length) return new Date(Math.min(...exact.map((candidate) => candidate.instant)));
  const next = candidates.filter((candidate) => candidate.local > local).sort((a, b) => a.local.localeCompare(b.local) || a.instant - b.instant)[0];
  if (!next) throw new Error("Unable to resolve UK meal cutoff.");
  return new Date(next.instant);
}

export function mealChangeOpen(date: string, settings: { cutoffDays: number; cutoffTime: string }, now = new Date()) {
  return now.getTime() < cutoffInstant(date, settings.cutoffDays, settings.cutoffTime).getTime();
}

export function mealWeekday(date: string) { return new Date(`${date}T00:00:00Z`).getUTCDay(); }
