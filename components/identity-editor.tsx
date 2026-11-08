"use client";

import { useState } from "react";
import { readWebsiteIdentity, type WebsiteIdentity } from "@/lib/website-identity";

export function IdentityEditor({ initial }: { initial: string }) {
  const [identity, setIdentity] = useState<WebsiteIdentity>(() => readWebsiteIdentity(initial));
  function field(key: Exclude<keyof WebsiteIdentity, "heroBackground">, value: string) {
    setIdentity((current) => ({ ...current, [key]: value }));
  }
  return <div className="portal-form">
    <input type="hidden" name="body" value={JSON.stringify(identity)} />
    <label>School name<input value={identity.name} required maxLength={100} onChange={(event) => field("name", event.target.value)} /></label>
    <label>School tagline<input value={identity.tagline} required maxLength={100} onChange={(event) => field("tagline", event.target.value)} /></label>
    <label>DfE URN<input value={identity.urn} maxLength={40} onChange={(event) => field("urn", event.target.value)} /></label>
    <label>Public logo HTTPS URL<input value={identity.logoUrl} type="url" required maxLength={2048} onChange={(event) => field("logoUrl", event.target.value)} /></label>
    <label>Public contact email<input value={identity.email} type="email" maxLength={254} onChange={(event) => field("email", event.target.value)} /></label>
    <label>Public contact telephone<input value={identity.phone} maxLength={40} onChange={(event) => field("phone", event.target.value)} /></label>
    <label>Footer description<textarea value={identity.footerDescription} maxLength={300} onChange={(event) => field("footerDescription", event.target.value)} /></label>
    <label>Header welcome message<input value={identity.visitsText} required maxLength={100} onChange={(event) => field("visitsText", event.target.value)} /></label>
    <label>Contact link label<input value={identity.contactLabel} required maxLength={100} onChange={(event) => field("contactLabel", event.target.value)} /></label>
    <label>Inspection badge label<input value={identity.inspectionLabel} required maxLength={100} onChange={(event) => field("inspectionLabel", event.target.value)} /></label>
    <label>Parent portal label<input value={identity.parentPortalLabel} required maxLength={100} onChange={(event) => field("parentPortalLabel", event.target.value)} /></label>
    <label>Staff portal label<input value={identity.staffPortalLabel} required maxLength={100} onChange={(event) => field("staffPortalLabel", event.target.value)} /></label>
    <label>Search label<input value={identity.searchLabel} required maxLength={100} onChange={(event) => field("searchLabel", event.target.value)} /></label>
    <label>Search example<input value={identity.searchPlaceholder} required maxLength={150} onChange={(event) => field("searchPlaceholder", event.target.value)} /></label>
    <label>Search button<input value={identity.searchButton} required maxLength={100} onChange={(event) => field("searchButton", event.target.value)} /></label>
    <label>Empty search message<input value={identity.searchEmpty} required maxLength={250} onChange={(event) => field("searchEmpty", event.target.value)} /></label>
    <label>No results message<input value={identity.searchNoResults} required maxLength={250} onChange={(event) => field("searchNoResults", event.target.value)} /></label>
    <label>Open search accessibility label<input value={identity.openSearch} required maxLength={100} onChange={(event) => field("openSearch", event.target.value)} /></label>
    <label>Close search accessibility label<input value={identity.closeSearch} required maxLength={100} onChange={(event) => field("closeSearch", event.target.value)} /></label>
    <label>Open menu accessibility label<input value={identity.openMenu} required maxLength={100} onChange={(event) => field("openMenu", event.target.value)} /></label>
    <label>Close menu accessibility label<input value={identity.closeMenu} required maxLength={100} onChange={(event) => field("closeMenu", event.target.value)} /></label>
    <label>Navigation accessibility label<input value={identity.mainNavigation} required maxLength={100} onChange={(event) => field("mainNavigation", event.target.value)} /></label>
    <label>Unconfirmed URN message<input value={identity.urnUnconfirmed} required maxLength={100} onChange={(event) => field("urnUnconfirmed", event.target.value)} /></label>
    <label>Homepage browser title<input value={identity.homepageTitle} required maxLength={160} onChange={(event) => field("homepageTitle", event.target.value)} /></label>
    <label>Homepage search description<textarea value={identity.homepageDescription} required maxLength={300} onChange={(event) => field("homepageDescription", event.target.value)} /></label>
    <label>Homepage hero background<select value={identity.heroBackground} onChange={(event) => {
      const value = event.target.value;
      if (value === "#f5f6fa" || value === "#fff9eb" || value === "#f0f7f2" || value === "#fff4f3") setIdentity((current) => ({ ...current, heroBackground: value }));
    }}><option value="#f5f6fa">Soft blue-grey</option><option value="#fff9eb">Warm cream</option><option value="#f0f7f2">Soft green</option><option value="#fff4f3">Soft pink</option></select></label>
    <small className="input-hint">Only use an approved public image. These details appear on the public website after publication; the enquiry inbox is configured separately.</small>
  </div>;
}
