import { ContactForm } from "@/components/contact-form";
import { db } from "@/lib/db";
import { websitePages } from "@/lib/website-pages";
import { readContactCopy } from "@/lib/contact-copy";

export async function SchoolContact({ preview = false }: { preview?: boolean }) {
  const live = await db.websitePagePublished.findUnique({ where: { pageId: "contact" } });
  const draft = preview ? await db.websitePageDraft.findUnique({ where: { pageId: "contact" } }) : null;
  const content = draft ?? live ?? websitePages().find((page) => page.id === "contact")!;
  const [liveCopy, draftCopy] = await Promise.all([
    db.websitePagePublished.findUnique({ where: { pageId: "contact-copy" }, select: { body: true } }),
    preview ? db.websitePageDraft.findUnique({ where: { pageId: "contact-copy" }, select: { body: true } }) : Promise.resolve(null),
  ]);
  const copy = readContactCopy(draftCopy?.body ?? liveCopy?.body);
  return <main id="main-content" className="local-page"><section className="container local-page-inner">
    <span className="eyebrow">{copy.eyebrow}</span>
    <h1>{content.title}</h1>
    {content.body.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    {preview && <p>The contact form is disabled in this preview. No message will be sent.</p>}
    <ContactForm preview={preview} copy={copy} />
  </section></main>;
}
