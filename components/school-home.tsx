import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Church,
  Clock3,
  Heart,
  Leaf,
  MapPin,
  Music2,
  ShieldCheck,
  Sparkles,
  Star,
  UsersRound,
} from "lucide-react";
import { PublicUpdates } from "@/components/public-updates";
import { SchoolLogo } from "@/components/school-logo";
import { PublicSocial } from "@/components/public-social";
import { WebsitePopup } from "@/components/website-popup";
import { DraftWebsitePopup } from "@/components/draft-website-popup";
import { db } from "@/lib/db";
import { statutoryReports } from "@/lib/statutory-links";
import { readWebsiteIdentity } from "@/lib/website-identity";
import { readWebsiteCopy, type WebsiteCopy } from "@/lib/website-copy";
import { readHomeLayout } from "@/lib/website-home-layout";
import { Fragment } from "react";

const statutoryLinks: { title: keyof WebsiteCopy; text: keyof WebsiteCopy; icon: typeof Heart; color: string; href: string }[] = [
  { title: "usefulOfstedTitle", text: "usefulOfstedText", icon: ShieldCheck, color: "lavender", href: "#ofsted-and-siams" },
  { title: "usefulPremiumTitle", text: "usefulPremiumText", icon: Sparkles, color: "yellow", href: "#pupil-premium" },
  { title: "usefulAdmissionsTitle", text: "usefulAdmissionsText", icon: ArrowUpRight, color: "peach", href: "#admissions-information" },
  { title: "usefulSendTitle", text: "usefulSendText", icon: Heart, color: "mint", href: "#send-information" },
  { title: "usefulKs2Title", text: "usefulKs2Text", icon: ArrowRight, color: "lavender", href: "#ks2-performance" },
];

const values = [
  { title: "Our vision", text: "The school’s approved Christian vision will be shared here.", icon: Heart },
  { title: "Our values", text: "The school’s agreed values and their meaning will be added here.", icon: Sparkles },
  { title: "Our community", text: "How the school lives its vision will be described here.", icon: Leaf },
];

function SectionHeading({
  eyebrow,
  title,
  text,
  light = false,
}: {
  eyebrow: string;
  title: string;
  text?: string;
  light?: boolean;
}) {
  return (
    <div className={`section-heading${light ? " light" : ""}`}>
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  );
}

export async function SchoolHome({ preview = false }: { preview?: boolean }) {
  const live = await db.websitePagePublished.findUnique({ where: { pageId: "home" } });
  const draft = preview ? await db.websitePageDraft.findUnique({ where: { pageId: "home" } }) : null;
  const content = draft ?? live;
  const [liveIdentity, draftIdentity] = await Promise.all([
    db.websitePagePublished.findUnique({ where: { pageId: "site-identity" }, select: { body: true } }),
    preview ? db.websitePageDraft.findUnique({ where: { pageId: "site-identity" }, select: { body: true } }) : Promise.resolve(null),
  ]);
  const identity = readWebsiteIdentity(draftIdentity?.body ?? liveIdentity?.body);
  const [publishedSections, draftSections] = await Promise.all([
    db.websitePagePublished.findMany({ where: { pageId: { startsWith: "home-" } } }),
    preview ? db.websitePageDraft.findMany({ where: { pageId: { startsWith: "home-" } } }) : Promise.resolve([]),
  ]);
  const section = (id: string) => draftSections.find((item) => item.pageId === id) ?? publishedSections.find((item) => item.pageId === id);
  const copy = readWebsiteCopy(section("home-copy")?.body);
  const layout = readHomeLayout(section("home-layout")?.body);
  const heroImage = section("home-image");
  const href = (value: string) => !preview || value.startsWith("#") ? value
    : value === "/" ? "/staff/website-preview" : `/staff/website-preview${value}`;
  const paragraphs = (body: string) => body.split(/\n\s*\n/).filter(Boolean).map((text, index) => <p className={index ? "body-copy muted-copy" : "body-copy"} key={index}>{text}</p>);
  const about = section("home-about");
  const vision = section("home-vision");
  const learning = section("home-learning");
  const church = section("home-church");
  const news = section("home-news");
  const practical = section("home-practical");
  const contact = section("home-contact");
  const aboutCard = section("home-about-card");
  const day = section("home-day");
  const term = section("home-term");
  const location = section("home-location");
  const explore = [section("home-explore-0"), section("home-explore-1"), section("home-explore-2")];
  const statutory = section("home-statutory-intro");
  const grants = section("home-grants");
  const statutoryItems = [
    { key: "home-statutory-ofsted", id: "ofsted-and-siams", title: "Ofsted & SIAMS", body: "verified report links to be added" },
    { key: "home-statutory-premium", id: "pupil-premium", title: "Pupil Premium & Sports Premium", body: "current plans and impact reports to be added" },
    { key: "home-statutory-send", id: "send-information", title: "SEND & Local Offer", body: "school and local authority information to be confirmed" },
    { key: "home-statutory-ks2", id: "ks2-performance", title: "KS2 performance", body: "current verified data and official links to be added" },
    { key: "home-statutory-admissions", id: "admissions-information", title: "Admissions", body: "approved arrangements and application information to be added" },
  ];
  const sections = {
      hero: <section className="hero" style={{ backgroundColor: identity.heroBackground }}>
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="hero-eyebrow"><span className="eyebrow-line" /> {identity.name}</div>
            <h1>{content ? content.title : <>Learn, Grow,<br /><em>Flourish.</em></>}</h1>
            <p className="hero-intro">
              {content?.body ?? "A joyful, nurturing place where every child is known, every question matters and every day brings a chance to flourish."}
            </p>
            <div className="hero-actions">
              <a className="button button-gold" href={href(layout.links.heroDiscover)}>{copy.heroDiscover} <ArrowRight size={17} /></a>
              <a className="text-link" href={href(layout.links.heroJoining)}>{copy.heroJoining} <ArrowUpRight size={15} /></a>
            </div>
            <div className="hero-trust">
              <span className="trust-icon"><Church size={17} /></span>
              <span><strong>{copy.heroTrustTitle}</strong><small>{copy.heroTrustText}</small></span>
            </div>
          </div>
          <div className="hero-art">
            <div className={`photo-frame${heroImage?.body ? " photo-frame-image" : ""}`}>
              {heroImage?.body && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="hero-image" src={heroImage.body} alt={heroImage.title} />
              )}
              <div className="photo-overlay" />
              <div className="sun-disc" />
              <div className="photo-caption"><span className="caption-pin"><MapPin size={14} /></span><span>{copy.heroCaption}</span></div>
              <div className="floating-note"><span className="note-star"><Star size={15} fill="currentColor" /></span><span><b>{copy.heroNoteTop}</b><br />{copy.heroNoteBottom}</span></div>
            </div>
            <div className="hero-stamp"><span>{copy.heroStampName}</span><strong>{copy.heroStampText}</strong><small /></div>
            <div className="art-sparkle sparkle-one">✳</div>
            <div className="art-sparkle sparkle-two">✦</div>
          </div>
        </div>
        <div className="hero-bottom container">
          <span><span className="scroll-dot" /> {copy.heroBottom}</span>
          <a href={href(layout.links.heroDiscover)} aria-label={copy.heroDiscover}><ArrowDown size={16} /></a>
        </div>
      </section>,

      welcome: <section className="welcome-strip">
        <div className="container welcome-grid">
          <div className="welcome-label"><span className="small-star">✳</span> {copy.welcomeLabel}</div>
          <p>{copy.welcomeText}</p>
          <a className="welcome-sub" href={href(layout.links.welcome)}>{copy.welcomeLink} <ArrowRight size={15} /></a>
        </div>
      </section>,

      about: <section id="our-school" className="section about-section">
        <div className="container about-grid">
          <div className="about-copy">
            <SectionHeading eyebrow={copy.aboutEyebrow} title={about?.title ?? "Big dreams grow in little places."} />
            {about ? paragraphs(about.body) : <><p className="body-copy">
              We&apos;re a Church of England primary school with a huge belief in what children can do. Our school community gives every child the confidence to explore, the support to keep going and the space to find their own way.
            </p>
            <p className="body-copy muted-copy">
              Inspired by our Christian foundation, we make kindness part of the everyday. We learn together, celebrate each other and care for the world we share.
            </p></>}
            <a className="button button-outline" href={href(layout.links.about)}>{copy.aboutLink} <ArrowRight size={16} /></a>
          </div>
          <div className="about-card">
            <div className="about-card-top"><span className="round-icon"><UsersRound size={20} /></span><span className="card-kicker">{copy.aboutCardLabel}</span></div>
            <h3>{aboutCard?.title ?? <>Known by name.<br /><em>Ready to grow.</em></>}</h3>
            <p>{aboutCard?.body ?? "Strong relationships. A community that cheers every child on."}</p>
            <div className="scribble-line" />
            <div className="about-card-bottom">
              <span><span className="card-star">✳</span> {copy.aboutCardBottom}</span>
              <a href={href(layout.links.aboutCard)} aria-label={copy.aboutCardBottom}><ArrowUpRight size={17} /></a>
            </div>
            <div className="about-illustration" aria-hidden="true"><span /><span /><span /><span /></div>
          </div>
        </div>
      </section>,

      vision: <section id="vision" className="values-section">
        <div className="container values-inner">
          <div className="values-intro">
            <span className="eyebrow light-eyebrow">{copy.visionEyebrow}</span>
            <h2>{vision?.title ?? <>Growing with<br /><em>purpose.</em></>}</h2>
            <p>{vision?.body ?? "Our Christian vision and school values will be shared here once the school confirms the approved wording."}</p>
            <a className="light-link" href={href(layout.links.vision)}>{copy.visionLink} <ArrowRight size={15} /></a>
          </div>
          <div className="values-list">
            {values.map(({ title, text, icon: Icon }, index) => (
              <article className="value-card" key={title}>
                <span className={`value-number value-${index + 1}`}>0{index + 1}</span>
                <span className="value-icon"><Icon size={20} /></span>
                <div><h3>{section(`home-value-${index}`)?.title ?? title}</h3><p>{section(`home-value-${index}`)?.body ?? text}</p></div>
              </article>
            ))}
            <div className="values-script">{section("home-vision-note")?.body ?? "Vision & values · wording to be confirmed"} <span>✳</span></div>
          </div>
          <span className="values-orbit orbit-a" /><span className="values-orbit orbit-b" />
        </div>
      </section>,

      learning: <section id="learning" className="section explore-section">
        <div className="container">
          <div className="explore-heading">
            <SectionHeading eyebrow={copy.learningEyebrow} title={learning?.title ?? "Room to wonder. Space to thrive."} text={learning?.body ?? "A broad, thoughtful education for the whole child — shaped by care, creativity and a little bit of village magic."} />
            <a className="button button-outline" href={href(layout.links.learning)}>{copy.learningLink} <ArrowRight size={16} /></a>
          </div>
          <div className="explore-grid">
            <a className="explore-card explore-green" href={href(layout.links.explore1)}>
              <span className="explore-icon"><Leaf size={19} /></span><span className="explore-label">{copy.exploreLabel1}</span>
              <h3>{explore[0]?.title ?? <>Different paths.<br />Equal possibility.</>}</h3><p>{explore[0]?.body ?? "Learning that meets children where they are and helps them find their next step."}</p>
              <span className="card-arrow"><ArrowUpRight size={18} /></span>
            </a>
            <a className="explore-card explore-peach" href={href(layout.links.explore2)}>
              <span className="explore-icon"><Music2 size={19} /></span><span className="explore-label">{copy.exploreLabel2}</span>
              <h3>{explore[1]?.title ?? <>More than<br />the classroom.</>}</h3><p>{explore[1]?.body ?? "Space for imagination, friendship, fresh air and finding what makes you shine."}</p>
              <span className="card-arrow"><ArrowUpRight size={18} /></span>
            </a>
            <a className="explore-card explore-blue" href={href(layout.links.explore3)}>
              <span className="explore-icon"><BookOpen size={19} /></span><span className="explore-label">{copy.exploreLabel3}</span>
              <h3>{explore[2]?.title ?? <>Growing<br />side by side.</>}</h3><p>{explore[2]?.body ?? "When families and school share the journey, wonderful things happen."}</p>
              <span className="card-arrow"><ArrowUpRight size={18} /></span>
            </a>
          </div>
        </div>
      </section>,

      information: <section className="statutory-section" id="parents">
        <div className="container statutory-grid">
          <div className="statutory-heading">
            <span className="eyebrow">{copy.usefulEyebrow}</span>
            <h2>{copy.usefulTitle}</h2>
            <p>{copy.usefulText}</p>
          </div>
          <div className="statutory-links">
            {statutoryLinks.map(({ title, text, icon: Icon, color, href }) => (
              <a href={href} className="statutory-link" key={title}>
                <span className={`stat-icon ${color}`}><Icon size={19} /></span>
                <span><strong>{copy[title]}</strong><small>{copy[text]}</small></span>
                <ArrowUpRight className="stat-arrow" size={16} />
              </a>
            ))}
          </div>
          <div className="statutory-note"><span className="note-asterisk">✳</span> {section("home-statutory-note")?.body ?? "Verified statutory information will be added by the school."}</div>
          <div className="statutory-details" id="statutory-information">
            <span className="eyebrow">{statutory?.title ?? "School information"}</span>
            <p>{statutory?.body ?? "Published statutory details are being checked with the school. Until verified, no inspection judgements, funding figures, admission arrangements or performance statistics are shown here."}</p>
            <div>
              {statutoryItems.map((item) => {
                const content = section(item.key);
                const reports = statutoryReports.filter((report) => report.target === item.id).map((report) => ({ ...report, url: section(report.id)?.body })).filter((report) => report.url);
                return <span id={item.id} key={item.id}>{content?.title ?? item.title} — {content?.body ?? item.body}{reports.map((report) => <span key={report.id}> · <a href={report.url} target="_blank" rel="noopener noreferrer">{report.label}</a></span>)}</span>;
              })}
            </div>
          </div>
        </div>
      </section>,

      grants: grants?.body.trim() ? <section className="section" id="grant-thanks"><div className="container">
        <span className="eyebrow">{copy.grantsEyebrow}</span>
        <h2>{grants.title}</h2>
        {grants.body.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p className="body-copy" key={index}>{paragraph}</p>)}
      </div></section> : null,

      church: <section className="section community-section" id="church">
        <div className="container community-grid">
          <div className={`community-art${section("home-church-image")?.body ? " community-art-custom" : ""}`}>
            {section("home-church-image")?.body ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={section("home-church-image")!.body} alt={section("home-church-image")!.title} />
            ) : <>
            <div className="community-sun" />
            <div className="church-building"><span className="church-roof" /><span className="church-tower"><i /><b /></span><span className="church-body"><i /><i /><i /></span><span className="church-door" /></div>
            <span className="community-flower">✳</span>
            </>}
            <span className="community-caption">{copy.churchCaption}</span>
          </div>
          <div className="community-copy">
            <span className="eyebrow">{copy.churchEyebrow}</span>
            <h2>{church?.title ?? <>Part of the<br /><em>Hallaton story.</em></>}</h2>
            {church ? paragraphs(church.body) : <><p className="body-copy">Our Christian foundation is woven through daily life — in the way we care, the way we listen and the way we celebrate each person&apos;s worth.</p>
            <p className="body-copy muted-copy">We share a connection with St Michael &amp; All Angels Church and the wider village. That relationship brings generations together and gives children a sense of being part of something bigger.</p></>}
            <a className="text-link dark-link" href={href(layout.links.church)}>{copy.churchLink} <ArrowRight size={15} /></a>
          </div>
        </div>
      </section>,

      news: <section className="news-section" id="news">
        <div className="container">
          <div className="news-top">
            <SectionHeading eyebrow={copy.newsEyebrow} title={news?.title ?? "A little school news."} text={news?.body ?? "The latest from our school community. News and dates are managed by the school team."} />
            <a className="text-link dark-link" href={href(layout.links.news)}>{copy.newsLink} <ArrowRight size={16} /></a>
          </div>
          <PublicUpdates preview={preview} copy={copy} image={section("home-news-image")?.body ? { url: section("home-news-image")!.body, alt: section("home-news-image")!.title } : undefined} />
          <PublicSocial preview={preview} />
        </div>
      </section>,

      practical: <section className="practical-section" id="admissions">
        <div className="container practical-inner">
          <div className="practical-intro">
            <span className="eyebrow light-eyebrow">{copy.practicalEyebrow}</span>
            <h2>{practical?.title ?? <>Good to know.<br /><em>Easy to find.</em></>}</h2>
            <p>{practical?.body ?? "We're happy to help with the practical questions — and even happier to show you around."}</p>
            <a className="button button-gold" href={href(layout.links.practical)}>{copy.practicalLink} <ArrowRight size={16} /></a>
          </div>
          <div className="practical-cards">
            <article className="practical-card">
              <div className="practical-card-head"><span className="practical-icon"><Clock3 size={19} /></span><span>{copy.dayLabel}</span></div>
              <h3>{day?.title ?? <>From hello<br />to see you soon.</>}</h3>
              <p>{day?.body ?? "School day timings are being confirmed. Please contact the school office for current start, finish and attendance times."}</p>
              <a href={href(layout.links.day)}>{copy.dayLink} <ArrowUpRight size={14} /></a>
            </article>
            <article className="practical-card">
              <div className="practical-card-head"><span className="practical-icon"><CalendarDays size={19} /></span><span>{copy.termLabel}</span></div>
              <h3>{term?.title ?? <>Plan a little<br />time together.</>}</h3>
              <p>{term?.body ?? "Confirmed term dates and holiday information will be published here as soon as they are available."}</p>
              <a href={href(layout.links.term)}>{copy.termLink} <ArrowUpRight size={14} /></a>
            </article>
            <article className="practical-card">
              <div className="practical-card-head"><span className="practical-icon"><MapPin size={19} /></span><span>{copy.locationLabel}</span></div>
              <h3>{location?.title ?? <>Right here in<br />Hallaton village.</>}</h3>
              <p>{location?.body ?? "Address and visitor information are available from the school office. We'd love to welcome you."}</p>
              <a href={href(layout.links.location)}>{copy.locationLink} <ArrowUpRight size={14} /></a>
            </article>
          </div>
        </div>
      </section>,

      contact: <section className="final-cta" id="contact">
        <div className="container final-cta-inner">
          <div><span className="eyebrow">{copy.contactEyebrow}</span><h2>{contact?.title ?? <>Come see what<br /><em>we can grow.</em></>}</h2></div>
          <div className="final-cta-right"><p>{contact?.body ?? "Questions, a curious child or just passing by? Our school office would be glad to hear from you."}</p><a className="button button-navy" href={href(layout.links.contact)}>{copy.contactLink} <ArrowRight size={16} /></a></div>
          <span className="cta-flower">✳</span>
        </div>
      </section>,
  };
  return (
    <main id="main-content">
      {preview ? <DraftWebsitePopup /> : <WebsitePopup />}
      {layout.order.map((key) => layout.visible[key] && <Fragment key={key}>{sections[key]}</Fragment>)}

      <footer className="site-footer">
        <div className="container footer-main">
          <div className="footer-brand">
            <a className="brand brand-footer" href="#" aria-label={`${identity.name} home`}><SchoolLogo src={identity.logoUrl} /><span className="brand-type"><strong>{identity.name}</strong><small>{identity.tagline}</small></span></a>
            <p>{identity.footerDescription}</p>
            <span className="footer-urn">DfE URN · {identity.urn || "TO BE CONFIRMED"}</span>
          </div>
          <div className="footer-col"><span className="footer-title">{copy.footerNavigation}</span><a href={href(layout.links.footerSchool)}>{copy.footerSchool}</a><a href={href(layout.links.footerLearning)}>{copy.footerLearning}</a><a href={href(layout.links.footerFamilies)}>{copy.footerFamilies}</a><a href={href(layout.links.footerNews)}>{copy.footerNews}</a></div>
          <div className="footer-col"><span className="footer-title">{copy.footerInformation}</span><a href={href(layout.links.footerOfsted)}>{copy.usefulOfstedTitle}</a><a href={href(layout.links.footerPremium)}>{copy.usefulPremiumTitle}</a><a href={href(layout.links.footerAdmissions)}>{copy.usefulAdmissionsTitle}</a><a href={href(layout.links.footerKs2)}>{copy.usefulKs2Title}</a><a href={href(layout.links.footerSend)}>{copy.usefulSendTitle}</a></div>
          <div className="footer-contact"><span className="footer-title">{copy.footerContact}</span>{identity.email && !preview ? <a href={`mailto:${identity.email}`}>{identity.email}</a> : <span>{identity.email || "School email to be confirmed"}</span>}<span>{identity.phone || "School phone to be confirmed"}</span>{!preview && <><a href="/parent/sign-in" className="footer-portal">{copy.footerParent} <ArrowUpRight size={13} /></a><a href="/staff/sign-in" className="footer-portal">{copy.footerStaff} <ArrowUpRight size={13} /></a></>}</div>
        </div>
        <div className="container footer-bottom"><span>© {new Date().getFullYear()} {identity.name}.</span><div><a href={href(layout.links.footerSafeguarding)}>{copy.footerSafeguarding}</a><a href={href(layout.links.footerPrivacy)}>{copy.footerPrivacy}</a><a href={href(layout.links.footerOfsted)}>{copy.footerOfsted}</a><PublicSocial footer preview={preview} /></div></div>
      </footer>
    </main>
  );
}
