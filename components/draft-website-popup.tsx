"use client";

import { useEffect, useState } from "react";
import { PopupDialog, type Popup } from "@/components/website-popup";

export function DraftWebsitePopup() {
  const [popup, setPopup] = useState<Popup | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/staff/website-popup", { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("Could not load the draft popup.");
      return response.json() as Promise<Popup | null>;
    }).then(setPopup).catch((error: unknown) => { if (!controller.signal.aborted) console.error("Could not load the draft popup", error); });
    return () => controller.abort();
  }, []);
  return popup ? <PopupDialog popup={popup} imageUrl={`/api/staff/website-popup/image?v=${encodeURIComponent(popup.updatedAt)}`} onDismiss={() => setPopup(null)} preview /> : null;
}
