import type { NavigationSection } from "@/lib/school-navigation";
import { isCustomPageId } from "@/lib/website-custom-page";

export function schoolPageId(href: string) {
  return href.startsWith("/page?") ? new URLSearchParams(href.slice(6)).get("pid") : null;
}

export function classPageLinks(navigation: NavigationSection[]) {
  return navigation.find((section) => schoolPageId(section.href) === "102")?.children ?? [];
}

export function isClassCardId(id: string) {
  const prefix = "class-card-";
  if (!id.startsWith(prefix)) return false;
  const target = id.slice(prefix.length);
  return /^\d+$/.test(target) || isCustomPageId(target);
}
