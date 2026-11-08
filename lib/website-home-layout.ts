import { z } from "zod";
import { navigationInput } from "@/lib/website-navigation";
import { isCustomPageId } from "@/lib/website-custom-page";

export const homeSections = ["hero", "welcome", "about", "vision", "learning", "information", "grants", "church", "news", "practical", "contact"] as const;
export type HomeSection = typeof homeSections[number];

export const defaultHomeLayout = {
  links: {
    heroDiscover: "#our-school", heroJoining: "#admissions", welcome: "/contact",
    about: "#vision", aboutCard: "#admissions", vision: "#church", learning: "#send-information",
    explore1: "#send-information", explore2: "#church", explore3: "#parents",
    church: "#contact", news: "#newsletter", practical: "#contact", day: "#contact",
    term: "#contact", location: "#contact", contact: "/contact",
    footerSchool: "#our-school", footerLearning: "#learning", footerFamilies: "#parents", footerNews: "#news",
    footerOfsted: "#ofsted-and-siams", footerPremium: "#pupil-premium", footerAdmissions: "#admissions-information",
    footerKs2: "#ks2-performance", footerSend: "#send-information",
    footerSafeguarding: "#contact", footerPrivacy: "#contact",
  },
  visible: {
    hero: true, welcome: true, about: true, vision: true, learning: true,
    information: true, grants: true, church: true, news: true, practical: true, contact: true,
  },
  order: [...homeSections],
} as const;

export type HomeLayout = {
  links: { [K in keyof typeof defaultHomeLayout.links]: string };
  visible: { [K in keyof typeof defaultHomeLayout.visible]: boolean };
  order: HomeSection[];
};
const localLink = z.string().max(512).refine((value) => {
  if (/^#[a-z0-9-]+$/.test(value)) return true;
  return navigationInput.safeParse([{ label: "Link", href: value }]).success;
}, "Use a local page, contact link or homepage anchor.");
const linksShape = Object.fromEntries(Object.keys(defaultHomeLayout.links).map((key) => [key, localLink])) as Record<keyof HomeLayout["links"], typeof localLink>;
const visibleShape = Object.fromEntries(Object.keys(defaultHomeLayout.visible).map((key) => [key, z.boolean()])) as Record<keyof HomeLayout["visible"], z.ZodBoolean>;
export const homeLayoutInput = z.object({
  links: z.object(linksShape).strict(),
  visible: z.object(visibleShape).strict(),
  order: z.array(z.enum(homeSections)).length(homeSections.length).refine((value) => new Set(value).size === homeSections.length, "Each section must occur once.").default([...homeSections]),
}).strict();
export function readHomeLayout(body: string | null | undefined): HomeLayout {
  return body == null ? { links: { ...defaultHomeLayout.links }, visible: { ...defaultHomeLayout.visible }, order: [...homeSections] } : homeLayoutInput.parse(JSON.parse(body));
}
export function homeLayoutCustomTargets(body: string) {
  const { links } = homeLayoutInput.parse(JSON.parse(body));
  return [...new Set(Object.values(links).map((href) => href.startsWith("/page?") ? new URLSearchParams(href.slice(6)).get("pid") : null)
    .filter((id): id is string => !!id && isCustomPageId(id)))];
}
