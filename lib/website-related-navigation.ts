import { additionalPages } from "@/lib/school-additional-pages";
import { navigationSections } from "@/lib/website-navigation";
import type { NavigationSection } from "@/lib/school-navigation";
import { schoolNavigation } from "@/lib/school-navigation";
import { schoolPageId } from "@/lib/class-navigation";

export const relatedNavigationInput = navigationSections
  .refine((sections) => sections.every((section) => schoolPageId(section.href) !== null), "Each section must identify a school page.")
  .refine((sections) => new Set(sections.map((section) => schoolPageId(section.href))).size === sections.length, "Each school page can have only one related-links section.");

export function defaultRelatedNavigation(): NavigationSection[] {
  const parents = [...new Set(Object.values(additionalPages).map((page) => page.parent))];
  const known = schoolNavigation.flatMap((section) => [section, ...(section.children ?? [])]);
  return parents.map((parent) => ({
    label: known.find((page) => page.href.startsWith("/page?") && new URLSearchParams(page.href.slice(6)).get("pid") === parent)?.label ?? `Page ${parent}`,
    href: `/page?pid=${parent}`,
    children: Object.entries(additionalPages)
      .filter(([, page]) => page.parent === parent)
      .map(([id, page]) => ({ label: page.title, href: `/page?${new URLSearchParams({ title: page.title, pid: id })}` })),
  }));
}

export function readRelatedNavigation(body: string | null | undefined) {
  return body == null ? defaultRelatedNavigation() : relatedNavigationInput.parse(JSON.parse(body));
}
