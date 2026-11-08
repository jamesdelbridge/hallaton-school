import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { isStaff } from "@/lib/permissions";
import { StaffDashboard } from "@/components/staff-dashboard";
import { staffAccess } from "@/lib/staff-access";

export default async function StaffPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/staff/sign-in");
  if (!isStaff(session.user.role)) redirect("/parent");
  if (!(await staffAccess(session.user.id, session.user.role))) redirect("/staff/sign-in");
  return <StaffDashboard name={session.user.name ?? "School colleague"} role={session.user.role} />;
}
