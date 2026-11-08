"use client";

import { useEffect, useState, type FormEvent } from "react";
import { NavigationEditor } from "@/components/navigation-editor";
import { IdentityEditor } from "@/components/identity-editor";
import { CopyEditor } from "@/components/copy-editor";
import { HomeLayoutEditor } from "@/components/home-layout-editor";
import { ContactCopyEditor } from "@/components/contact-copy-editor";

type Page = { id: string; title: string; body: string; documents: { title: string; url: string }[]; updatedAt: string | null };

export function WebsitePageSettings({ canPublish }: { canPublish: boolean }) {
  const [pages, setPages] = useState<Page[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newTitle, setNewTitle] = useState("");

  async function load() {
    const response = await fetch("/api/staff/website-pages", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load website pages.");
    const result = await response.json() as Page[];
    setPages(result);
    setSelected((current) => current || result.find((page) => !page.id.startsWith("home-report-"))?.id || "");
  }
  useEffect(() => {
    void Promise.resolve().then(load).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load pages."));
  }, []);

  const page = pages.find((item) => item.id === selected);
  async function request(method: "PUT" | "POST", data: object) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/staff/website-pages", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!response.ok) {
        const result = await response.json() as { error?: string };
        throw new Error(result.error ?? "Could not update the page.");
      }
      await load();
      setNotice(method === "PUT" ? "Draft saved. The public page has not changed." : "This page has been published.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update the page."); }
    finally { setBusy(false); }
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!page) return;
    const form = new FormData(event.currentTarget);
    const raw = form.get("documents");
    const documents = typeof raw === "string" ? raw.split("\n").filter((line) => line.trim()).map((line) => {
      const separator = line.indexOf("|");
      return { title: separator < 0 ? "" : line.slice(0, separator).trim(), url: separator < 0 ? "" : line.slice(separator + 1).trim() };
    }) : undefined;
    void request("PUT", { pageId: page.id, title: form.get("title"), body: form.get("body"), documents, updatedAt: page.updatedAt });
  }

  async function createPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = `custom-${newSlug}`;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/staff/website-pages", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pageId: id, title: newTitle, body: "", documents: [], updatedAt: null, create: true }) });
      if (!response.ok) {
        const result = await response.json() as { error?: string };
        throw new Error(result.error ?? "Could not create the page.");
      }
      await load();
      setSelected(id); setNewSlug(""); setNewTitle("");
      setNotice(`Page draft created. Its menu link is /page?pid=${id}. Publish the page before publishing a menu that links to it.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create the page."); }
    finally { setBusy(false); }
  }

  return <article className="portal-panel">
    <div className="panel-heading"><div><span className="portal-eyebrow">PUBLIC WEBSITE</span><h2>School page text</h2></div></div>
    <p className="panel-note">Edit homepage sections and cards, school pages, PDF links, class-card labels and images, or the website navigation. News, events, social links and popup are managed separately.</p>
    {error && <div className="portal-alert error-alert" role="alert">{error}</div>}
    {notice && <div className="portal-alert success-alert" role="status">{notice}</div>}
    <details>
      <summary>Create a new school page</summary>
      <form className="portal-form" onSubmit={createPage}>
        <label>Page heading<input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} required maxLength={160} /></label>
        <label>Page address name<input value={newSlug} onChange={(event) => setNewSlug(event.target.value)} required maxLength={43} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="after-school-club" /></label>
        <small className="input-hint">Use lowercase letters, numbers and hyphens. The address name cannot be changed later.</small>
        <button className="portal-submit" disabled={busy}>Create page draft</button>
      </form>
    </details>
    <label>School page <select value={selected} onChange={(event) => { setSelected(event.target.value); setNotice(""); }} disabled={busy}>{pages.filter((item) => !item.id.startsWith("home-report-")).map((item) => <option key={item.id} value={item.id}>{item.id === "home" ? "Homepage: " : item.id.startsWith("home-") ? `Homepage (${item.id.slice(5)}): ` : item.id.startsWith("class-card-") ? "Class card: " : ""}{item.title}</option>)}</select></label>
    {page && <>
      <form className="portal-form" onSubmit={save} key={`${page.id}:${page.updatedAt ?? "new"}`}>
        <label>{["home-image", "home-news-image", "home-church-image"].includes(page.id) ? "Image description" : "Heading"}<input name="title" defaultValue={page.title} required maxLength={160} /></label>
        {page.id === "home-grants" && <p>Enter acknowledgements as paragraphs. Leave the text empty to hide this section.</p>}
        {page.id === "navigation" || page.id === "related-navigation" ? <NavigationEditor initial={page.body} related={page.id === "related-navigation"} /> : page.id === "site-identity" ? <IdentityEditor initial={page.body} /> : page.id === "home-copy" ? <CopyEditor initial={page.body} /> : page.id === "contact-copy" ? <ContactCopyEditor initial={page.body} /> : page.id === "home-layout" ? <HomeLayoutEditor initial={page.body} /> : page.id.startsWith("class-card-") || ["home-image", "home-news-image", "home-church-image"].includes(page.id) ? <><label>Public image HTTPS URL<input name="body" type="url" required={page.id.startsWith("class-card-")} defaultValue={page.body} maxLength={2048} /></label><small className="input-hint">Only use an image approved for public use and check pupil consent. {page.id.startsWith("class-card-") ? "The image is decorative; the card heading identifies the class." : "Leave empty to use the default illustration."}</small></> : <label>Paragraphs<textarea name="body" defaultValue={page.body} rows={12} maxLength={30000} /></label>}
        {page.id !== "navigation" && page.id !== "related-navigation" && page.id !== "site-identity" && page.id !== "contact-copy" && !page.id.startsWith("class-card-") && page.id !== "home" && !page.id.startsWith("home-") && page.id !== "contact" && page.id !== "102" && <label>PDF links — one per line as title | HTTPS PDF URL<textarea name="documents" rows={6} defaultValue={page.documents.map((document) => `${document.title} | ${document.url}`).join("\n")} /></label>}
        <button className="portal-submit" disabled={busy}>Save page draft</button>
      </form>
      <div className="panel-actions">
        {page.id.startsWith("custom-") && <p>Menu link: <code>/page?pid={page.id}</code></p>}
        <a className="row-action" href={page.id === "related-navigation" ? "/staff/website-preview/page?pid=16" : page.id === "navigation" || page.id === "site-identity" || page.id === "home" || page.id.startsWith("home-") ? "/staff/website-preview" : page.id.startsWith("class-card-") ? "/staff/website-preview/page?pid=102" : page.id === "contact" || page.id === "contact-copy" ? "/staff/website-preview/contact" : `/staff/website-preview/page?pid=${encodeURIComponent(page.id)}`} target="_blank" rel="noreferrer">Preview saved page</a>
        <a className="row-action" href="/staff/website-preview" target="_blank" rel="noreferrer">Browse draft website</a>
        {canPublish && page.updatedAt && <button className="row-action" disabled={busy} type="button" onClick={() => { if (window.confirm("Publish this saved page draft? Unsaved edits are not included.")) void request("POST", { pageId: page.id, updatedAt: page.updatedAt }); }}>Publish this page</button>}
      </div>
    </>}
  </article>;
}
