import { notFound } from "next/navigation";
import { SchoolHome } from "@/components/school-home";
import { PreviewNavigation } from "@/components/preview-navigation";
import { websitePreviewUser } from "@/lib/website-preview-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export default async function WebsitePreviewHome() {
  const user = await websitePreviewUser();
  if (!user) notFound();
  await db.auditLog.create({ data: { actorId: user.id, action: "VIEW_WEBSITE_PAGE_DRAFT", entityType: "WebsitePage", entityId: "home" } });
  return <PreviewNavigation><SchoolHome preview /></PreviewNavigation>;
}
