import { notFound } from "next/navigation";
import { websitePreviewUser } from "@/lib/website-preview-auth";
import { db } from "@/lib/db";
import { SchoolContact } from "@/components/school-contact";

export const dynamic = "force-dynamic";
export default async function WebsitePreviewContact() {
  const user = await websitePreviewUser();
  if (!user) notFound();
  await db.auditLog.create({ data: { actorId: user.id, action: "VIEW_WEBSITE_PAGE_DRAFT", entityType: "WebsitePage", entityId: "contact" } });
  return <SchoolContact preview />;
}
