import { z } from "zod";
import { schoolNavigation } from "@/lib/school-navigation";
import { additionalPages } from "@/lib/school-additional-pages";
import { isCustomPageId } from "@/lib/website-custom-page";

const pageIds = new Set([
  ...schoolNavigation.flatMap((section) => [section, ...(section.children ?? [])])
    .filter((link) => link.href.startsWith("/page?"))
    .map((link) => new URLSearchParams(link.href.split("?")[1]).get("pid")),
  ...Object.keys(additionalPages),
]);

const href = z.string().max(512).refine((value) => {
  if (value === "/" || value === "/contact" || /^\/#[a-z0-9-]+$/.test(value)) return true;
  if (!value.startsWith("/page?") || value.includes("#") || value.includes("\\")) return false;
  const query = new URLSearchParams(value.slice(6));
  return [...query.keys()].every((key) => key === "pid" || key === "title") &&
    query.getAll("pid").length === 1 && query.getAll("title").length <= 1 &&
    (pageIds.has(query.get("pid")) || isCustomPageId(query.get("pid") ?? ""));
}, "Use a local school page, homepage section or contact link.");

const link = z.object({ label: z.string().trim().min(1).max(100), href }).strict();
export const navigationSections = z.array(link.extend({ children: z.array(link).max(40).optional() }).strict()).max(20)
  .refine((sections) => new Set(sections.map((section) => section.label)).size === sections.length, "Menu section names must be unique.");
export const navigationInput = navigationSections.refine((sections) => sections.length > 0, "Add at least one menu.");

export function readNavigation(body: string | null | undefined) {
  return body == null ? schoolNavigation : navigationInput.parse(JSON.parse(body));
}

export function customNavigationTargets(body: string, allowEmpty = false) {
  const sections = (allowEmpty ? navigationSections : navigationInput).parse(JSON.parse(body));
  return [...new Set(sections.flatMap((section) => [section, ...(section.children ?? [])])
    .map(({ href }) => href.startsWith("/page?") ? new URLSearchParams(href.slice(6)).get("pid") : null)
    .filter((id): id is string => id !== null && isCustomPageId(id)))];
}
