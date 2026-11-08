"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PopupDialog } from "@/components/website-popup";

type Settings = { tagline: string; imageAlt: string; linkUrl: string; linkLabel: string; startsAt: string; endsAt: string; enabled: boolean; updatedAt: string };

function localDate(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function WebsitePopupSettings({ canPublish }: { canPublish: boolean }) {
  const [settings, setSettings] = useState<Settings | null | undefined>(undefined);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    fetch("/api/staff/website-popup").then(async (response) => {
      if (!response.ok) throw new Error("Could not load website popup settings.");
      return response.json() as Promise<Settings | null>;
    }).then(setSettings).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load settings."));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setError(""); setNotice("");
    try {
      data.set("startsAt", new Date(String(data.get("startsAt"))).toISOString());
      data.set("endsAt", new Date(String(data.get("endsAt"))).toISOString());
      data.set("enabled", data.get("enabled") === "on" ? "true" : "false");
      data.set("baseVersion", settings?.updatedAt ?? "");
      const response = await fetch("/api/staff/website-popup", { method: "PUT", body: data });
      if (!response.ok) {
        const result = await response.json() as { error?: string };
        throw new Error(result.error ?? "Could not save the popup.");
      }
      const refreshed = await fetch("/api/staff/website-popup");
      if (!refreshed.ok) throw new Error("Popup saved, but settings could not be refreshed.");
      setSettings(await refreshed.json() as Settings);
      setNotice("Popup draft saved. The public website has not changed.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save popup."); }
    finally { setBusy(false); }
  }
  async function publish() {
    if (!settings) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/staff/website-popup/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ updatedAt: settings.updatedAt }) });
      if (!response.ok) {
        const result = await response.json() as { error?: string };
        throw new Error(result.error ?? "Could not publish the popup.");
      }
      const refreshed = await fetch("/api/staff/website-popup");
      if (!refreshed.ok) throw new Error("Popup published, but the draft could not be refreshed.");
      setSettings(await refreshed.json() as Settings);
      setNotice("Popup draft published to the public website.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not publish popup."); }
    finally { setBusy(false); }
  }
  return <article className="portal-panel">
    <div className="panel-heading"><div><span className="portal-eyebrow">PUBLIC WEBSITE</span><h2>Website popup</h2></div></div>
    <p className="panel-note">Changes are saved as a draft. Only an administrator can publish the saved draft. Preview shows the popup even outside its scheduled dates or while disabled. Times use your device&apos;s time zone. Only use images approved for public use and check pupil consent before publishing.</p>
    {error && <div className="portal-alert error-alert" role="alert">{error}</div>}
    {notice && <div className="portal-alert success-alert" role="status">{notice}</div>}
    {settings !== undefined && <form className="portal-form" onSubmit={save} key={settings?.updatedAt ?? "new"}>
      <label>Tagline<input name="tagline" required maxLength={160} defaultValue={settings?.tagline ?? ""} /></label>
      <label>Image description for screen readers<input name="imageAlt" required maxLength={250} defaultValue={settings?.imageAlt ?? ""} /></label>
      <label>{settings ? "Replace image (optional)" : "Image"}<input name="image" type="file" accept="image/png,image/jpeg,image/webp" required={!settings} /></label>
      <small className="input-hint">{settings ? "Leave empty to keep the current image. " : ""}PNG, JPEG or WebP, up to 5 MB.</small>
      <label>Link address<input name="linkUrl" required maxLength={2048} defaultValue={settings?.linkUrl ?? ""} placeholder="https://... or /contact" /></label>
      <label>Link text<input name="linkLabel" required maxLength={80} defaultValue={settings?.linkLabel ?? ""} /></label>
      <label>Start date and time<input name="startsAt" type="datetime-local" required defaultValue={settings ? localDate(settings.startsAt) : ""} /></label>
      <label>End date and time<input name="endsAt" type="datetime-local" required defaultValue={settings ? localDate(settings.endsAt) : ""} /></label>
      <label className="publish-toggle"><input name="enabled" type="checkbox" defaultChecked={settings?.enabled ?? false} /><span>Enable scheduled popup on the public homepage</span></label>
      <button className="portal-submit" disabled={busy}>{busy ? "Saving…" : "Save popup draft"}</button>
    </form>}
    {settings && <div className="panel-actions"><button type="button" className="row-action" disabled={busy} onClick={() => setPreview(true)}>Preview saved popup</button>{canPublish && <button type="button" className="row-action" disabled={busy} onClick={() => { if (window.confirm("Publish the saved popup draft to the public website? Unsaved edits are not included.")) void publish(); }}>Publish saved popup</button>}</div>}
    {preview && settings && <PopupDialog popup={settings} imageUrl={`/api/staff/website-popup/image?v=${encodeURIComponent(settings.updatedAt)}`} onDismiss={() => setPreview(false)} preview />}
  </article>;
}
