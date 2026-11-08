import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { ParentDashboard } from "@/components/parent-dashboard";

export default async function ParentPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/parent/sign-in");
  if (session.user.role !== Role.PARENT) redirect("/staff");
  return <ParentDashboard name={session.user.name ?? "Family"} />;
}
