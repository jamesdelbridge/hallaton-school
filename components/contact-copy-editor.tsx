"use client";

import { useState } from "react";
import { readContactCopy, type ContactCopy } from "@/lib/contact-copy";

export function ContactCopyEditor({ initial }: { initial: string }) {
  const [copy, setCopy] = useState<ContactCopy>(() => readContactCopy(initial));
  return <div className="portal-form">
    <p>Have the school&apos;s safeguarding and data protection leads approve these notices before publication. Changing the wording does not change how enquiries are processed.</p>
    <input type="hidden" name="body" value={JSON.stringify(copy)} />
    {(Object.keys(copy) as (keyof ContactCopy)[]).map((key) => <label key={key}>{key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())}
      <textarea value={copy[key]} required maxLength={1000} rows={key.endsWith("Notice") ? 4 : 2} onChange={(event) => setCopy((current) => ({ ...current, [key]: event.target.value }))} />
    </label>)}
  </div>;
}
