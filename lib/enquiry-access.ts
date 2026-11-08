import { Role } from "@prisma/client";
import { db } from "@/lib/db";

export async function activeEnquiryRole(userId: string, role: Role) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { active: true, role: true } });
  return Boolean(user?.active && user.role === role);
}

export async function enquiryAccess(userId: string, role: Role) {
  if (!(await activeEnquiryRole(userId, role))) return false;
  if (role === Role.SUPER_ADMIN) return true;
  const settings = await db.enquirySettings.findUnique({ where: { id: "school" } });
  if (role === Role.TEACHER) return settings?.teacherAccess ?? true;
  if (role === Role.SAFEGUARDING_LEAD) return settings?.safeguardingLeadAccess ?? false;
  return false;
}
