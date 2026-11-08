import { Role } from "@prisma/client";

export function isStaff(role: Role) {
  return role === Role.SUPER_ADMIN || role === Role.TEACHER || role === Role.SAFEGUARDING_LEAD;
}

export function canManageSchoolContent(role: Role) {
  return role === Role.SUPER_ADMIN || role === Role.TEACHER;
}

export function canManageProfiles(role: Role) {
  return role === Role.SUPER_ADMIN || role === Role.TEACHER || role === Role.SAFEGUARDING_LEAD;
}

export function canAccessSafeguarding(role: Role) {
  return role === Role.TEACHER || role === Role.SAFEGUARDING_LEAD;
}
