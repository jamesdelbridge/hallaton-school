"use client";

import { useState } from "react";
import { readWebsiteCopy, type WebsiteCopy } from "@/lib/website-copy";

export function CopyEditor({ initial }: { initial: string }) {
  const [copy, setCopy] = useState<WebsiteCopy>(() => readWebsiteCopy(initial));
  return <div className="portal-form">
    <input type="hidden" name="body" value={JSON.stringify(copy)} />
    {(Object.keys(copy) as (keyof WebsiteCopy)[]).map((key) => <label key={key}>{key.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase())}
      <input value={copy[key]} required maxLength={250} onChange={(event) => setCopy((current) => ({ ...current, [key]: event.target.value }))} />
    </label>)}
  </div>;
}
