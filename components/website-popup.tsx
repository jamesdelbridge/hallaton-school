"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export type Popup = { tagline: string; imageAlt: string; linkUrl: string; linkLabel: string; updatedAt: string };

export function WebsitePopup() {
  const [popup, setPopup] = useState<Popup | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/public/website-popup", { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("Website popup could not be loaded.");
      return response.json() as Promise<Popup | null>;
    }).then((result) => {
      if (!result) return;
      try { if (sessionStorage.getItem("website-popup-dismissed") === result.updatedAt) return; }
      catch (error) { console.error("Could not read popup dismissal", error); }
      setPopup(result);
    }).catch((error: unknown) => { if (!controller.signal.aborted) console.error("Could not load website popup", error); });
    return () => controller.abort();
  }, []);
  function dismiss() {
    if (popup) {
      try { sessionStorage.setItem("website-popup-dismissed", popup.updatedAt); }
      catch (error) { console.error("Could not save popup dismissal", error); }
    }
    setPopup(null);
  }
  if (!popup) return null;
  return <PopupDialog popup={popup} imageUrl={`/api/public/website-popup/image?v=${encodeURIComponent(popup.updatedAt)}`} onDismiss={dismiss} />;
}

export function PopupDialog({ popup, imageUrl, onDismiss, preview = false }: { popup: Popup; imageUrl: string; onDismiss: () => void; preview?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element.showModal();
    return () => { if (element.open) element.close(); previousFocus?.focus(); };
  }, []);
  return <dialog ref={dialog} className="website-popup" aria-labelledby="website-popup-title" onCancel={(event) => { event.preventDefault(); onDismiss(); }}>
    <div className="website-popup-image">
      {/* Uploaded images are served by the application, not the Next image optimizer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt={popup.imageAlt} />
      <button type="button" className="website-popup-close" onClick={onDismiss} aria-label="Close announcement" autoFocus><X size={20} /></button>
      <div className="website-popup-copy"><span>Hallaton Church of England Primary School{preview ? " · Draft preview" : ""}</span><h2 id="website-popup-title">{popup.tagline}</h2><a href={popup.linkUrl} onClick={(event) => { if (preview) event.preventDefault(); onDismiss(); }}>{popup.linkLabel} <span aria-hidden="true">→</span></a></div>
    </div>
  </dialog>;
}
