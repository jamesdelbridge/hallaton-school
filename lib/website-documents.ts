import { z } from "zod";
import { schoolPageDocuments } from "@/lib/school-page-documents";

export const documentList = z.array(z.object({
  title: z.string().trim().min(1).max(160).refine((value) => !value.includes("|") && !/[\r\n]/.test(value), "Document titles cannot contain a vertical bar or newline."),
  url: z.string().max(2048).refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password &&
        (url.pathname.toLowerCase().endsWith(".pdf") || url.searchParams.get("type")?.toLowerCase() === "pdf");
    } catch { return false; }
  }, "Document links must be HTTPS PDF URLs."),
})).max(50);

export function defaultDocuments(pageId: string) {
  return (schoolPageDocuments[pageId] ?? []).map(({ title, file }) => ({
    title, url: `https://www.hallatonprimary.co.uk/attachments/download.asp?file=${file}&type=pdf`,
  }));
}

export function readDocuments(value: string | null | undefined, pageId: string) {
  if (value == null) return defaultDocuments(pageId);
  return documentList.parse(JSON.parse(value));
}
