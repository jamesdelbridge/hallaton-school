export function localSchoolLink(href: string): string {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return href;
  }
  if (!["hallatonprimary.co.uk", "www.hallatonprimary.co.uk"].includes(url.hostname.toLowerCase())) return href;
  if (/\.pdf$/i.test(url.pathname) || (url.pathname.toLowerCase() === "/attachments/download.asp" && url.searchParams.get("type")?.toLowerCase() === "pdf")) return href;
  if (url.pathname === "/page" || url.pathname === "/page/") return `/page${url.search}${url.hash}`;
  if (url.pathname.startsWith("/news") || url.pathname.startsWith("/calendar")) return "/#news";
  return `${url.pathname}${url.search}${url.hash}`;
}
