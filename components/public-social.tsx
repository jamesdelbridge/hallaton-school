"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Instagram } from "lucide-react";

type SocialLink = { platform: string; url: string };
export function PublicSocial({ footer = false, preview = false }: { footer?: boolean; preview?: boolean }) {
  const [links, setLinks] = useState<SocialLink[]>([]);
  useEffect(() => {
    fetch(preview ? "/api/staff/website-preview/social" : "/api/public/social").then((response) => {
      if (!response.ok) throw new Error("Social links could not be loaded.");
      return response.json() as Promise<SocialLink[]>;
    }).then(setLinks).catch((error: unknown) => console.error("Could not load public social links", error));
  }, [preview]);
  if (!links.length) return null;
  if (footer) return <>{links.map((link) => preview ? <span key={link.platform}>{link.platform}</span> : <a key={link.platform} href={link.url} target="_blank" rel="noopener noreferrer">{link.platform === "Instagram" && <Instagram size={15} />} {link.platform}</a>)}</>;
  return <div className="instagram-feed"><span className="instagram-mark"><Instagram size={18} /></span><div><span className="eyebrow">From our wider community</span><strong>Follow our school</strong><small>Visit our official social media pages.</small></div><div className="social-public-links">{links.map((link) => preview ? <span key={link.platform}>{link.platform} <ArrowUpRight size={14} /></span> : <a key={link.platform} href={link.url} target="_blank" rel="noopener noreferrer">{link.platform} <ArrowUpRight size={14} /></a>)}</div></div>;
}
