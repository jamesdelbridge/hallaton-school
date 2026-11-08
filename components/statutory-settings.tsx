"use client";

import { useEffect, useState, type FormEvent } from "react";
import { statutoryReports } from "@/lib/statutory-links";

type Report = { id: string; title: string; body: string; updatedAt: string | null };

export function StatutorySettings() {
  const [pages, setPages] = useState<Report[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  async function load() {
    const response = await fetch("/api/staff/website-pages", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load report links.");
    setPages(await response.json() as Report[]);
  }
  useEffect(() => { void Promise.resolve().then(load).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load report links.")); }, []);
  async function save(event: FormEvent<HTMLFormElement>, report: Report) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(report.id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/staff/website-pages", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pageId: report.id, title: report.title, body: String(form.get("url") ?? ""), updatedAt: report.updatedAt }) });
      if (!response.ok) { const result = await response.json() as { error?: string }; throw new Error(result.error ?? "Could not save report link."); }
      await load();
      setNotice("Report link saved as a draft. An administrator must publish it before it appears on the public website.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save report link."); }
    finally { setBusy(""); }
  }
  return <article className="portal-panel">
    <div className="panel-heading"><div><span className="portal-eyebrow">PUBLIC WEBSITE</span><h2>School information links</h2></div></div>
    <p className="panel-note">Add an HTTPS link to enable it under School information. Clear a link to remove it. Save each draft, preview it, then ask an administrator to publish it. Check that documents are current and approved.</p>
    {error && <div role="alert" className="portal-alert error-alert">{error}</div>}
    {notice && <div role="status" className="portal-alert success-alert">{notice}</div>}
    {statutoryReports.map(({ id, label }) => {
      const page = pages.find((item) => item.id === id);
      return page && <form className="portal-form" key={`${id}:${page.updatedAt ?? "new"}`} onSubmit={(event) => void save(event, page)}>
        <label>{label} link<input name="url" type="url" maxLength={2048} defaultValue={page.body} placeholder="https://..." /></label>
        <button className="row-action" disabled={Boolean(busy)}>{busy === id ? "Saving…" : `Save ${label} draft`}</button>
      </form>;
    })}
    <div className="panel-actions"><a className="row-action" href="/staff/website-preview#statutory-information" target="_blank" rel="noreferrer">Preview school information</a></div>
  </article>;
}
