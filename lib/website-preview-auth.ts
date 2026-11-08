import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { activeEnquiryRole } from "@/lib/enquiry-access";
import { canManageSchoolContent } from "@/lib/permissions";

export async function websitePreviewUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canManageSchoolContent(session.user.role) || !(await activeEnquiryRole(session.user.id, session.user.role))) return null;
  return session.user;
}
