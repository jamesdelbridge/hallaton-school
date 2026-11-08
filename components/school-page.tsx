import Link from "next/link";
import { notFound } from "next/navigation";
import { schoolNavigation } from "@/lib/school-navigation";
import { schoolPageContent } from "@/lib/school-page-content";
import { PublicUpdates } from "@/components/public-updates";
import { readDocuments } from "@/lib/website-documents";
import { additionalPages } from "@/lib/school-additional-pages";
import { db } from "@/lib/db";
import { isCustomPageId } from "@/lib/website-custom-page";
import { readWebsiteCopy } from "@/lib/website-copy";
import { classPageLinks, schoolPageId } from "@/lib/class-navigation";
import { readNavigation } from "@/lib/website-navigation";
import { websitePages } from "@/lib/website-pages";
import { readRelatedNavigation } from "@/lib/website-related-navigation";

export async function renderSchoolPage(pid: string | undefined, preview = false) {
  const links = schoolNavigation.flatMap((section) => [section, ...(section.children ?? [])]);
  const page = links.find((link) => link.href.startsWith("/page?") && new URLSearchParams(link.href.split("?")[1]).get("pid") === pid) ?? (pid && additionalPages[pid] ? { label: additionalPages[pid].title } : undefined);
  const live = await db.websitePagePublished.findUnique({ where: { pageId: pid ?? "" } });
  const draft = preview ? await db.websitePageDraft.findUnique({ where: { pageId: pid ?? "" } }) : null;
  const content = draft ?? live;
  const [liveCopy, draftCopy, liveNavigation, draftNavigation, liveRelated, draftRelated, liveNewsImage, draftNewsImage] = await Promise.all([
    db.websitePagePublished.findUnique({ where: { pageId: "home-copy" }, select: { body: true } }),
    preview ? db.websitePageDraft.findUnique({ where: { pageId: "home-copy" }, select: { body: true } }) : Promise.resolve(null),
    db.websitePagePublished.findUnique({ where: { pageId: "navigation" }, select: { body: true } }),
    preview ? db.websitePageDraft.findUnique({ where: { pageId: "navigation" }, select: { body: true } }) : Promise.resolve(null),
    db.websitePagePublished.findUnique({ where: { pageId: "related-navigation" }, select: { body: true } }),
    preview ? db.websitePageDraft.findUnique({ where: { pageId: "related-navigation" }, select: { body: true } }) : Promise.resolve(null),
    pid === "16" ? db.websitePagePublished.findUnique({ where: { pageId: "home-news-image" }, select: { title: true, body: true } }) : Promise.resolve(null),
    preview && pid === "16" ? db.websitePageDraft.findUnique({ where: { pageId: "home-news-image" }, select: { title: true, body: true } }) : Promise.resolve(null),
  ]);
  const newsImage = draftNewsImage ?? liveNewsImage;
  const copy = readWebsiteCopy(draftCopy?.body ?? liveCopy?.body);
  if (!page && !(pid && isCustomPageId(pid) && content)) notFound();
  const documents = readDocuments(content?.documents, pid ?? "");
  const pageHref = (href: string) => !preview ? href : href === "/" ? "/staff/website-preview" : href.startsWith("/#") ? `/staff/website-preview${href.slice(1)}` : `/staff/website-preview${href}`;
  const classes = classPageLinks(readNavigation(draftNavigation?.body ?? liveNavigation?.body));
  const related = readRelatedNavigation(draftRelated?.body ?? liveRelated?.body).find((section) => schoolPageId(section.href) === pid)?.children ?? [];
  const defaultCards = websitePages().filter((entry) => entry.id.startsWith("class-card-"));
  const [publishedCards, draftCards] = pid === "102" ? await Promise.all([
    db.websitePagePublished.findMany({ where: { pageId: { startsWith: "class-card-" } } }),
    preview ? db.websitePageDraft.findMany({ where: { pageId: { startsWith: "class-card-" } } }) : Promise.resolve([]),
  ]) : [[], []];

  return (
    <main id="main-content" className="local-page">
      <section className="container local-page-inner">
        <span className="eyebrow">{copy.schoolPageEyebrow}</span>
        <h1>{content?.title ?? page?.label}</h1>
        {pid === "102" ? (
          <>
            {(content ? content.body.split(/\n\s*\n/).filter(Boolean) : ["Choose a class to visit its page."]).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            <div className="class-grid">
              {classes.map((item, index) => {
                const id = schoolPageId(item.href);
                const card = draftCards.find((entry) => entry.pageId === `class-card-${id}`) ?? publishedCards.find((entry) => entry.pageId === `class-card-${id}`);
                const fallback = defaultCards.find((entry) => entry.id === `class-card-${id}`);
                const image = card?.body ?? fallback?.body;
                return (
                <Link className="class-card" href={pageHref(item.href)} key={`${item.href}:${index}`}>
                  {image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="" />
                  )}
                  <h2>{card?.title ?? item.label}</h2><span>{copy.classPageLink} →</span>
                </Link>
              );})}
            </div>
          </>
        ) : (
          <>
            {!content && <p className="school-preview-notice">{copy.schoolPageNotice}</p>}
            {(content ? content.body.split(/\n\s*\n/).filter(Boolean) : schoolPageContent[pid ?? ""] ?? ["Information for this page is awaiting review."]).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            {documents.length > 0 && <div className="school-documents"><h2>{copy.schoolDocumentsTitle}</h2><p>{copy.schoolDocumentsNotice}</p><ul>{documents.map((document, index) => <li key={`${document.url}:${index}`}><a href={document.url} target="_blank" rel="noreferrer">{document.title} (PDF)</a></li>)}</ul></div>}
            {related.length > 0 && <div className="school-documents"><h2>{copy.relatedInformationTitle}</h2><ul>{related.map((child, index) => <li key={`${child.href}:${index}`}><Link href={pageHref(child.href)}>{child.label}</Link></li>)}</ul></div>}
            {pid === "16" && <PublicUpdates preview={preview} copy={copy} image={newsImage?.body ? { url: newsImage.body, alt: newsImage.title } : undefined} />}
            <p><Link href={preview ? "/staff/website-preview/contact" : "/contact"}>{copy.schoolPageContactLink}</Link> {copy.schoolPageContactSuffix}</p>
          </>
        )}
        {pid !== "102" && classes.some((item) => schoolPageId(item.href) === pid) && <Link href={pageHref("/page?title=Class+Pages&pid=102")}>← {copy.allClassPagesLink}</Link>}
      </section>
    </main>
  );
}
