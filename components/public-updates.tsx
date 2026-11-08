"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, CalendarDays, FileText } from "lucide-react";
import { localSchoolLink } from "@/lib/local-school-link";
import { defaultWebsiteCopy, type WebsiteCopy } from "@/lib/website-copy";

type PublicData = {
  announcements: Array<{ id: string; title: string; body: string; publishedAt: string }>;
  newsletters: Array<{ id: string; title: string; issueDate: string; publicUrl: string | null }>;
  events: Array<{ id: string; title: string; description: string; startsAt: string; endsAt: string | null }>;
};

function date(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function newsletterHref(url: string | null, preview: boolean) {
  if (!url) return "#newsletter";
  const href = localSchoolLink(url);
  if (!preview || /\.pdf(?:$|[?#])|[?&]type=pdf(?:&|$)/i.test(href)) return href;
  if (href.startsWith("/page?") || href === "/contact") return `/staff/website-preview${href}`;
  return "#newsletter";
}

export function PublicUpdates({ preview = false, copy = defaultWebsiteCopy, image }: { preview?: boolean; copy?: WebsiteCopy; image?: { url: string; alt: string } }) {
  const [data, setData] = useState<PublicData | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    fetch(preview ? "/api/staff/website-preview/updates" : "/api/public")
      .then((response) => {
        if (!response.ok) throw new Error("School updates unavailable");
        return response.json() as Promise<PublicData>;
      })
      .then(setData)
      .catch(() => {
        setData({ announcements: [], newsletters: [], events: [] });
        setUnavailable(true);
      });
  }, [preview]);

  return (
    <div className="public-updates-grid">
      {unavailable && <p className="updates-unavailable" role="status">{copy.updatesUnavailable}</p>}
      <section className="public-announcements">
        <div className={`news-image${image ? " news-image-custom" : ""}`}>{image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt={image.alt} />
        ) : <><div className="news-image-sun" /><div className="news-image-hill" /></>}<span className="news-image-label">{copy.updatesImageLabel}</span></div>
        {data?.announcements.length ? data.announcements.slice(0, 3).map((item) => (
          <article className="public-announcement" key={item.id}>
            <div className="news-meta"><span className="news-tag">{copy.updatesTag}</span><span>{date(item.publishedAt)}</span></div>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </article>
        )) : (
          <div className="public-announcement">
            <div className="news-meta"><span className="news-tag">{copy.updatesTag}</span><span>{copy.updatesComing}</span></div>
            <h3>{copy.updatesEmptyTitle}</h3>
            <p>{copy.updatesEmptyText}</p>
            <a className="text-link dark-link" href={preview ? "/staff/website-preview/contact" : "/contact"}>{copy.updatesContact} <ArrowRight size={15} /></a>
          </div>
        )}
      </section>
      <div className="news-side">
        <div className="dates-header"><span className="eyebrow">{copy.eventsEyebrow}</span><CalendarDays size={18} /></div>
        {data?.events.length ? (
          <div className="public-event-list">{data.events.map((event) => (
            <article key={event.id}><time>{date(event.startsAt)}</time><h3>{event.title}</h3><p>{event.description}</p></article>
          ))}</div>
        ) : (
          <div className="dates-empty"><span className="dates-calendar"><CalendarDays size={20} /></span><div><h3>{copy.eventsEmptyTitle}</h3><p>{copy.eventsEmptyText}</p></div></div>
        )}
        {!data?.events.length && <a className="text-link dark-link" href={preview ? "/staff/website-preview/contact" : "/contact"}>{copy.eventsContact} <ArrowRight size={15} /></a>}
        <div className="newsletter-card" id="newsletter">
          <span className="newsletter-spark">✳</span><span className="eyebrow">{copy.newsletterEyebrow}</span>
          <h3>{copy.newsletterTitle}</h3>
          <p>{copy.newsletterText}</p>
          {data?.newsletters.length ? (
            <div className="newsletter-list">{data.newsletters.map((item) => (
              <a className="newsletter-issue" href={newsletterHref(item.publicUrl, preview)} key={item.id} target={item.publicUrl && !preview ? "_blank" : undefined} rel={item.publicUrl ? "noreferrer" : undefined}>
                <FileText size={14} /><span>{item.title}<small>{date(item.issueDate)}</small></span><ArrowUpRight size={13} />
              </a>
            ))}</div>
          ) : <><a className="newsletter-button" href={preview ? "/staff/website-preview/contact" : "/contact"}>{copy.newsletterEmptyLink} <ArrowUpRight size={15} /></a><small>{copy.newsletterEmptyText}</small></>}
        </div>
      </div>
    </div>
  );
}
