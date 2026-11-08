import { Role } from "@prisma/client";
import { db } from "@/lib/db";

export async function staffAccess(userId: string, role: Role) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { active: true, role: true, sportsCoordinator: true, safeguardingLead: true, classAssignments: { select: { classGroupId: true } } },
  });
  if (!user?.active || user.role !== role || role === Role.PARENT) return null;
  return {
    admin: role === Role.SUPER_ADMIN,
    safeguarding: role === Role.SAFEGUARDING_LEAD,
    lead: role === Role.SAFEGUARDING_LEAD || (role === Role.TEACHER && user.safeguardingLead),
    sports: role === Role.TEACHER && user.sportsCoordinator,
    classIds: user.classAssignments.map((assignment) => assignment.classGroupId),
  };
}
