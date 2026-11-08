import { SchoolHome } from "@/components/school-home";
import { db } from "@/lib/db";
import { readWebsiteIdentity } from "@/lib/website-identity";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const live = await db.websitePagePublished.findUnique({ where: { pageId: "site-identity" }, select: { body: true } });
  const identity = readWebsiteIdentity(live?.body);
  return { title: identity.homepageTitle, description: identity.homepageDescription };
}
export default function HomePage() {
  return <SchoolHome />;
}
