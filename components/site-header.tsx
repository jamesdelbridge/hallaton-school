"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowUpRight, ChevronDown, Menu, Search, X } from "lucide-react";
import { SchoolLogo } from "@/components/school-logo";
import { schoolNavigation, type NavigationSection } from "@/lib/school-navigation";
import { defaultWebsiteIdentity, type WebsiteIdentity } from "@/lib/website-identity";

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [loadedNavigation, setLoadedNavigation] = useState<{ preview: boolean; items: NavigationSection[] } | null>(null);
  const [navigationError, setNavigationError] = useState(false);
  const [loadedIdentity, setLoadedIdentity] = useState<{ preview: boolean; identity: WebsiteIdentity } | null>(null);
  const [identityError, setIdentityError] = useState(false);
  const navigationRef = useRef<HTMLElement>(null);
  const preview = pathname.startsWith("/staff/website-preview");
  const navigation = loadedNavigation?.preview === preview ? loadedNavigation.items : schoolNavigation;
  const identity = loadedIdentity?.preview === preview ? loadedIdentity.identity : defaultWebsiteIdentity;

  useEffect(() => {
    const controller = new AbortController();
    const preview = pathname.startsWith("/staff/website-preview");
    fetch(preview ? "/api/staff/website-preview/identity" : "/api/public/identity", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("School identity could not be loaded.");
        return response.json() as Promise<WebsiteIdentity>;
      })
      .then((result) => { setLoadedIdentity({ preview, identity: result }); setIdentityError(false); })
      .catch((error: unknown) => { if (!controller.signal.aborted) { console.error("Could not load school identity", error); setIdentityError(true); } });
    return () => controller.abort();
  }, [pathname]);

  useEffect(() => {
    const controller = new AbortController();
    const preview = pathname.startsWith("/staff/website-preview");
    fetch(preview ? "/api/staff/website-preview/navigation" : "/api/public/navigation", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Navigation could not be loaded.");
        return response.json() as Promise<NavigationSection[]>;
      })
      .then((result) => { setLoadedNavigation({ preview, items: result }); setNavigationError(false); })
      .catch((error: unknown) => { if (!controller.signal.aborted) { console.error("Could not load website navigation", error); setNavigationError(true); } });
    return () => controller.abort();
  }, [pathname]);

  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (!navigationRef.current?.contains(event.target as Node)) setOpenSection(null);
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);

  function closeNavigation() {
    setOpenSection(null);
    setMenuOpen(false);
  }

  function searchSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("q") ?? "").trim().toLowerCase();
    if (!query) {
      setSearchMessage(identity.searchEmpty);
      return;
    }
    const match = Array.from(document.querySelectorAll<HTMLElement>("main section")).find((section) =>
      section.innerText.toLowerCase().includes(query),
    );
    if (!match) {
      setSearchMessage(identity.searchNoResults);
      return;
    }
    setSearchMessage("");
    setSearchOpen(false);
    if (match.id) window.history.replaceState(null, "", `#${match.id}`);
    match.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  const siteHref = (href: string) => !preview ? href : href === "/" ? "/staff/website-preview" : href.startsWith("/#") ? `/staff/website-preview${href.slice(1)}` : `/staff/website-preview${href}`;

  return (
    <>
      {preview && <div className="container" role="status"><p><strong>Draft website preview — staff only.</strong> News and events may include unpublished items. Review all selected drafts before publication. <Link href="/staff">Return to staff portal</Link></p></div>}
      <div className="topline">
        <div className="container topline-inner">
          <div className="topline-badges">
            <span className="topline-badge">DfE URN · {identity.urn || identity.urnUnconfirmed}</span>
            <Link className="topline-badge" href={siteHref("/#ofsted-and-siams")}>{identity.inspectionLabel}</Link>
          </div>
          <div className="topline-actions">
            <span className="open-dot" />
            <span>{identity.visitsText}</span>
            <Link href={siteHref("/contact")}>
              {identity.contactLabel} <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </div>
      <header className="site-header">
        {(navigationError || identityError) && <p role="alert">Website settings could not be loaded. Displayed information may be out of date.</p>}
        <div className="container header-inner">
          <Link className="brand" href={siteHref("/")} aria-label={`${identity.name} home`}>
            <SchoolLogo src={identity.logoUrl} />
            <span className="brand-type">
              <strong>{identity.name}</strong>
              <small>{identity.tagline}</small>
            </span>
          </Link>
          <div className="header-buttons">
            <button
              className="icon-button"
              type="button"
              aria-label={searchOpen ? identity.closeSearch : identity.openSearch}
              onClick={() => setSearchOpen(!searchOpen)}
            >
              {searchOpen ? <X size={19} /> : <Search size={19} />}
            </button>
            <button
              id="mobile-menu-button"
              className="icon-button menu-button"
              type="button"
              aria-label={menuOpen ? identity.closeMenu : identity.openMenu}
              aria-expanded={menuOpen}
              aria-controls="main-navigation"
              onClick={() => {
                setMenuOpen(!menuOpen);
                setOpenSection(null);
              }}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        <div className="navigation-bar">
          <nav
            ref={navigationRef}
            id="main-navigation"
            className={menuOpen ? "main-nav container is-open" : "main-nav container"}
            aria-label={identity.mainNavigation}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                if (openSection) {
                  const trigger = document.getElementById(`nav-trigger-${openSection}`);
                  setOpenSection(null);
                  trigger?.focus();
                } else if (menuOpen) {
                  setMenuOpen(false);
                  document.getElementById("mobile-menu-button")?.focus();
                }
              }
            }}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setOpenSection(null);
            }}
          >
            {navigation.map(({ label, href, children }, index) => (
              <div
                className={`nav-item${openSection === String(index) ? " nav-item-open" : ""}`}
                key={label}
                onMouseEnter={() => {
                  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
                    setOpenSection(children ? String(index) : null);
                  }
                }}
                onMouseLeave={() => {
                  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
                    setOpenSection((current) => current === String(index) ? null : current);
                  }
                }}
              >
                <Link className="nav-link" href={siteHref(href)} onClick={closeNavigation}>{label}</Link>
                {children && <>
                  <button
                    id={`nav-trigger-${index}`}
                    className="nav-dropdown-toggle"
                    type="button"
                    aria-label={`${label} submenu`}
                    aria-expanded={openSection === String(index)}
                    aria-controls={`nav-submenu-${index}`}
                    onClick={() => setOpenSection((current) => current === String(index) ? null : String(index))}
                  >
                    <ChevronDown size={14} aria-hidden="true" />
                  </button>
                  <ul id={`nav-submenu-${index}`} className="nav-dropdown" hidden={openSection !== String(index)}>
                    {children.map((child, childIndex) => (
                      <li key={`${child.href}:${childIndex}`}>
                        <a href={siteHref(child.href)} onClick={closeNavigation}>{child.label}</a>
                      </li>
                    ))}
                  </ul>
                </>}
              </div>
            ))}
            {!preview && <><Link href="/parent/sign-in" className="staff-link" onClick={closeNavigation}>
              {identity.parentPortalLabel} <ArrowUpRight size={14} />
            </Link>
            <Link href="/staff/sign-in" className="staff-link" onClick={closeNavigation}>
              {identity.staffPortalLabel} <ArrowUpRight size={14} />
            </Link></>}
          </nav>
        </div>
        {searchOpen && (
          <form onSubmit={searchSite} className="search-panel container" role="search">
            <label htmlFor="site-search">{identity.searchLabel}</label>
            <div className="search-input-wrap">
              <Search size={17} />
              <input id="site-search" name="q" placeholder={identity.searchPlaceholder} />
              <button type="submit">{identity.searchButton}</button>
            </div>
            {searchMessage && <span className="search-message" role="status">{searchMessage}</span>}
          </form>
        )}
      </header>
    </>
  );
}
