import { z } from "zod";

const publicImageUrl = z.string().max(2048).refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
}, "Enter a public HTTPS image URL.");

export const websiteIdentityInput = z.object({
  name: z.string().trim().min(1).max(100),
  tagline: z.string().trim().min(1).max(100),
  urn: z.string().trim().max(40),
  logoUrl: publicImageUrl,
  email: z.union([z.literal(""), z.email().max(254)]),
  phone: z.string().trim().max(40),
  footerDescription: z.string().trim().max(300),
  visitsText: z.string().trim().min(1).max(100).default("Visits welcome · get in touch"),
  contactLabel: z.string().trim().min(1).max(100).default("Contact us"),
  inspectionLabel: z.string().trim().min(1).max(100).default("Ofsted & SIAMS"),
  parentPortalLabel: z.string().trim().min(1).max(100).default("Parent portal"),
  staffPortalLabel: z.string().trim().min(1).max(100).default("Staff portal"),
  searchLabel: z.string().trim().min(1).max(100).default("What are you looking for?"),
  searchPlaceholder: z.string().trim().min(1).max(150).default("Try admissions, term dates or uniform…"),
  searchButton: z.string().trim().min(1).max(100).default("Search"),
  searchEmpty: z.string().trim().min(1).max(250).default("Enter a word or phrase to search the school website."),
  searchNoResults: z.string().trim().min(1).max(250).default("No matching section found. Try a different word or contact the school."),
  openSearch: z.string().trim().min(1).max(100).default("Open search"),
  closeSearch: z.string().trim().min(1).max(100).default("Close search"),
  openMenu: z.string().trim().min(1).max(100).default("Open menu"),
  closeMenu: z.string().trim().min(1).max(100).default("Close menu"),
  mainNavigation: z.string().trim().min(1).max(100).default("Main navigation"),
  urnUnconfirmed: z.string().trim().min(1).max(100).default("TO BE CONFIRMED"),
  homepageTitle: z.string().trim().min(1).max(160).default("Hallaton Church of England Primary School"),
  homepageDescription: z.string().trim().min(1).max(300).default("A warm welcome to Hallaton Church of England Primary School. Discover our school, our learning and how to get in touch."),
  heroBackground: z.enum(["#f5f6fa", "#fff9eb", "#f0f7f2", "#fff4f3"]).default("#f5f6fa"),
}).strict();

export type WebsiteIdentity = z.infer<typeof websiteIdentityInput>;

export const defaultWebsiteIdentity: WebsiteIdentity = {
  name: "Hallaton C of E Primary School",
  tagline: "Learn, Grow, Flourish",
  urn: process.env.NEXT_PUBLIC_SCHOOL_URN ?? "",
  logoUrl: "https://www.hallatonprimary.co.uk/_site/data/files/images/logo/07F2A0180F5BA634F05D59DB972EDBBF.png",
  email: process.env.NEXT_PUBLIC_SCHOOL_EMAIL ?? "",
  phone: process.env.NEXT_PUBLIC_SCHOOL_PHONE ?? "",
  footerDescription: "A village school with a big heart. Rooted in kindness. Ready to grow.",
  visitsText: "Visits welcome · get in touch",
  contactLabel: "Contact us",
  inspectionLabel: "Ofsted & SIAMS",
  parentPortalLabel: "Parent portal",
  staffPortalLabel: "Staff portal",
  searchLabel: "What are you looking for?",
  searchPlaceholder: "Try admissions, term dates or uniform…",
  searchButton: "Search",
  searchEmpty: "Enter a word or phrase to search the school website.",
  searchNoResults: "No matching section found. Try a different word or contact the school.",
  openSearch: "Open search",
  closeSearch: "Close search",
  openMenu: "Open menu",
  closeMenu: "Close menu",
  mainNavigation: "Main navigation",
  urnUnconfirmed: "TO BE CONFIRMED",
  homepageTitle: "Hallaton Church of England Primary School",
  homepageDescription: "A warm welcome to Hallaton Church of England Primary School. Discover our school, our learning and how to get in touch.",
  heroBackground: "#f5f6fa",
};

export function readWebsiteIdentity(body: string | null | undefined): WebsiteIdentity {
  return body == null ? defaultWebsiteIdentity : websiteIdentityInput.parse(JSON.parse(body));
}
