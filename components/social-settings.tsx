"use client";

import { useEffect, useState, type FormEvent } from "react";
import { socialPlatforms, type SocialPlatform } from "@/lib/social-links";

type LinkSetting = { platform: SocialPlatform; url: string; enabled: boolean };

export function SocialSettings() {
  const [links, setLinks] = useState<LinkSetting[] | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    const response = await fetch("/api/staff/social-settings");
    if (!response.ok) throw new Error("Could not load social media settings.");
    const { links: saved, updatedAt } = await response.json() as { links: LinkSetting[]; updatedAt: string | null };
    setLinks(socialPlatforms.map((platform) => saved.find((link) => link.platform === platform) ?? { platform, url: "", enabled: false }));
    setVersion(updatedAt);
  }
  useEffect(() => {
    void Promise.resolve().then(load).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load settings."));
  }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/staff/social-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ links, updatedAt: version }) });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Could not save settings.");
      }
      await load();
      setNotice("Social links draft saved. The public website has not changed.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save settings."); }
    finally { setBusy(false); }
  }
  async function publish() {
    if (!version || !window.confirm("Publish the saved social links draft? Unsaved edits are not included.")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/staff/social-settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ updatedAt: version }) });
      if (!response.ok) { const result = await response.json() as { error?: string }; throw new Error(result.error ?? "Could not publish social links."); }
      await load();
      setNotice("Social links published.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not publish social links."); }
    finally { setBusy(false); }
  }
  return <article className="portal-panel">
    <div className="panel-heading"><div><span className="portal-eyebrow">ADMINISTRATOR ONLY</span><h2>Social media links</h2></div></div>
    <p className="panel-note">Save changes as a draft, preview them, then publish. Only enabled links appear on the public website. Use official school accounts and review consent before posting pupil information.</p>
    {error && <div className="portal-alert error-alert" role="alert">{error}</div>}
    {notice && <div className="portal-alert success-alert" role="status">{notice}</div>}
    {links && <form className="portal-form" onSubmit={save}>{links.map((link, index) => <fieldset className="social-fieldset" key={link.platform}>
      <legend>{link.platform}</legend>
      <label>Page URL<input type="url" value={link.url} placeholder={`https://www.${link.platform.toLowerCase()}.com/`} onChange={(event) => {
        const url = event.target.value;
        setLinks((current) => current?.map((item, i) => i === index ? { ...item, url } : item) ?? null);
      }} /></label>
      <label className="publish-toggle"><input type="checkbox" checked={link.enabled} onChange={(event) => {
        const enabled = event.target.checked;
        setLinks((current) => current?.map((item, i) => i === index ? { ...item, enabled } : item) ?? null);
      }} />Show on the public website</label>
    </fieldset>)}<button className="portal-submit" disabled={busy}>{busy ? "Saving…" : "Save social links draft"}</button></form>}
    {version && <div className="panel-actions"><a className="row-action" href="/staff/website-preview" target="_blank" rel="noreferrer">Preview draft website</a><button type="button" className="row-action" disabled={busy} onClick={() => void publish()}>Publish social links</button></div>}
  </article>;
}
