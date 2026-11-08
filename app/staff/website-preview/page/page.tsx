import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { renderSchoolPage } from "@/components/school-page";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { activeEnquiryRole } from "@/lib/enquiry-access";
import { canManageSchoolContent } from "@/lib/permissions";
import { PreviewNavigation } from "@/components/preview-navigation";

export const dynamic = "force-dynamic";

export default async function WebsitePreviewPage({ searchParams }: { searchParams: Promise<{ pid?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/staff/sign-in");
  if (!canManageSchoolContent(session.user.role) || !(await activeEnquiryRole(session.user.id, session.user.role))) notFound();
  const { pid } = await searchParams;
  await db.auditLog.create({ data: { actorId: session.user.id, action: "VIEW_WEBSITE_PAGE_DRAFT", entityType: "WebsitePage", entityId: pid ?? "" } });
  return <PreviewNavigation>{await renderSchoolPage(pid, true)}</PreviewNavigation>;
}
