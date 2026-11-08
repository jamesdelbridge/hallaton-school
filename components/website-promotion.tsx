"use client";

import { useEffect, useState } from "react";

type Manifest = {
  pages: { pageId: string; title: string; updatedAt: string }[];
  popup: { tagline: string; enabled: boolean; startsAt: string; endsAt: string; updatedAt: string } | null;
  social: { updatedAt: string } | null;
  announcements: { id: string; title: string; version: string }[];
  newsletters: { id: string; title: string; version: string }[];
  events: { id: string; title: string; summary: string; startsAt: string; version: string }[];
};

export function WebsitePromotion() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    const response = await fetch("/api/staff/website-promotion", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load saved drafts.");
    setManifest(await response.json() as Manifest);
    setSelected([]);
  }
  useEffect(() => { void Promise.resolve().then(load).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load drafts.")); }, []);
  function toggle(id: string) { setSelected((old) => old.includes(id) ? old.filter((item) => item !== id) : [...old, id]); }
  async function publish() {
    if (!manifest || !selected.length || !window.confirm("Publish the selected saved drafts together? Unsaved edits and unselected items will not be published.")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/staff/website-promotion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        pages: manifest.pages.filter((page) => selected.includes(`page:${page.pageId}`)).map(({ pageId, updatedAt }) => ({ pageId, updatedAt })),
        popup: selected.includes("popup") ? manifest.popup?.updatedAt : null,
        social: selected.includes("social") ? manifest.social?.updatedAt : null,
        announcements: manifest.announcements.filter((item) => selected.includes(`announcement:${item.id}`)).map(({ id, version }) => ({ id, version })),
        newsletters: manifest.newsletters.filter((item) => selected.includes(`newsletter:${item.id}`)).map(({ id, version }) => ({ id, version })),
        events: manifest.events.filter((item) => selected.includes(`event:${item.id}`)).map(({ id, version }) => ({ id, version })),
      }) });
      if (!response.ok) { const result = await response.json() as { error?: string }; throw new Error(result.error ?? "Could not publish drafts."); }
      await load();
      setNotice("Selected drafts published together.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not publish drafts."); }
    finally { setBusy(false); }
  }
  return <article className="portal-panel">
    <div className="panel-heading"><div><span className="portal-eyebrow">ADMINISTRATOR ONLY</span><h2>Publish website drafts</h2></div></div>
    <p className="panel-note">Review the saved draft website first, then select items to publish together. Events appear here only when a separate public summary has been prepared. Check the public title, summary and date for safeguarding before publishing. Private event details and invitations are never published.</p>
    <div className="panel-actions"><a className="row-action" href="/staff/website-preview" target="_blank" rel="noreferrer">Browse draft website</a><button type="button" className="row-action" disabled={busy} onClick={() => void load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load drafts."))}>Reload saved drafts</button></div>
    {error && <div className="portal-alert error-alert" role="alert">{error}</div>}
    {notice && <div className="portal-alert success-alert" role="status">{notice}</div>}
    {manifest && <div className="portal-form">
      {manifest.pages.map((page) => <label className="publish-toggle" key={page.pageId}><input type="checkbox" checked={selected.includes(`page:${page.pageId}`)} onChange={() => toggle(`page:${page.pageId}`)} />{page.pageId.startsWith("home") ? "Homepage section" : "Page"}: {page.title}</label>)}
      {manifest.popup && <label className="publish-toggle"><input type="checkbox" checked={selected.includes("popup")} onChange={() => toggle("popup")} />Popup: {manifest.popup.tagline} ({manifest.popup.enabled ? "enabled" : "disabled"})</label>}
      {manifest.social && <label className="publish-toggle"><input type="checkbox" checked={selected.includes("social")} onChange={() => toggle("social")} />Social media links</label>}
      {manifest.announcements.map((item) => <label className="publish-toggle" key={item.id}><input type="checkbox" checked={selected.includes(`announcement:${item.id}`)} onChange={() => toggle(`announcement:${item.id}`)} />Announcement: {item.title}</label>)}
      {manifest.newsletters.map((item) => <label className="publish-toggle" key={item.id}><input type="checkbox" checked={selected.includes(`newsletter:${item.id}`)} onChange={() => toggle(`newsletter:${item.id}`)} />Newsletter: {item.title}</label>)}
      {manifest.events.map((item) => <label className="publish-toggle" key={item.id}><input type="checkbox" checked={selected.includes(`event:${item.id}`)} onChange={() => toggle(`event:${item.id}`)} /><span>Public event: {item.title} — {new Date(item.startsAt).toLocaleString("en-GB")}<br />{item.summary}</span></label>)}
      {!manifest.pages.length && !manifest.popup && !manifest.social && !manifest.announcements.length && !manifest.newsletters.length && !manifest.events.length && <p>No saved drafts are available.</p>}
      <button className="portal-submit" type="button" disabled={busy || !selected.length} onClick={() => void publish()}>Publish selected drafts together</button>
    </div>}
  </article>;
}
