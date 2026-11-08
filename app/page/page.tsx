import { renderSchoolPage } from "@/components/school-page";

export default async function SchoolPage({ searchParams }: { searchParams: Promise<{ pid?: string }> }) {
  const { pid } = await searchParams;
  return renderSchoolPage(pid);
}
