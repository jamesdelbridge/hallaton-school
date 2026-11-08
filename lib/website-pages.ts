import { schoolNavigation } from "@/lib/school-navigation";
import { schoolPageContent } from "@/lib/school-page-content";
import { additionalPages } from "@/lib/school-additional-pages";
import { statutoryReports } from "@/lib/statutory-links";
import { defaultWebsiteIdentity } from "@/lib/website-identity";
import { defaultWebsiteCopy } from "@/lib/website-copy";
import { defaultHomeLayout } from "@/lib/website-home-layout";
import { defaultContactCopy } from "@/lib/contact-copy";
import { defaultRelatedNavigation } from "@/lib/website-related-navigation";

export function websitePages() {
  const pages = new Map<string, { id: string; title: string; body: string }>();
  pages.set("site-identity", { id: "site-identity", title: "Website identity and contact details", body: JSON.stringify(defaultWebsiteIdentity) });
  pages.set("home-copy", { id: "home-copy", title: "Homepage labels and buttons", body: JSON.stringify(defaultWebsiteCopy) });
  pages.set("home-layout", { id: "home-layout", title: "Homepage links and section visibility", body: JSON.stringify(defaultHomeLayout) });
  pages.set("home-image", { id: "home-image", title: "Homepage illustration", body: "" });
  pages.set("home-news-image", { id: "home-news-image", title: "News illustration", body: "" });
  pages.set("home-church-image", { id: "home-church-image", title: "Church illustration", body: "" });
  pages.set("contact-copy", { id: "contact-copy", title: "Contact form labels and notices", body: JSON.stringify(defaultContactCopy) });
  for (const report of statutoryReports) pages.set(report.id, { id: report.id, title: report.label, body: "" });
  pages.set("home-grants", { id: "home-grants", title: "Thank you to our supporters", body: "" });
  pages.set("navigation", { id: "navigation", title: "Website navigation", body: JSON.stringify(schoolNavigation, null, 2) });
  pages.set("related-navigation", { id: "related-navigation", title: "Related information links", body: JSON.stringify(defaultRelatedNavigation(), null, 2) });
  pages.set("class-card-104", { id: "class-card-104", title: "Maple Class", body: "https://www.hallatonprimary.co.uk/_site/data/files/images/auto_upload/page/102/25C20EBEF4CD501059AB265EE1042E14.png" });
  pages.set("class-card-106", { id: "class-card-106", title: "Oak Class", body: "https://www.hallatonprimary.co.uk/_site/data/files/images/auto_upload/page/102/6F45DF811C5FAD12569AA7369B13EA32.png" });
  pages.set("class-card-103", { id: "class-card-103", title: "Willow Class", body: "https://www.hallatonprimary.co.uk/_site/data/files/images/auto_upload/page/102/79712BBFB1855BE8701E365547FBDCED.png" });
  pages.set("home", { id: "home", title: "Learn, Grow, Flourish.", body: "A joyful, nurturing place where every child is known, every question matters and every day brings a chance to flourish." });
  pages.set("home-about", { id: "home-about", title: "Big dreams grow in little places.", body: "We're a Church of England primary school with a huge belief in what children can do. Our school community gives every child the confidence to explore, the support to keep going and the space to find their own way.\n\nInspired by our Christian foundation, we make kindness part of the everyday. We learn together, celebrate each other and care for the world we share." });
  pages.set("home-vision", { id: "home-vision", title: "Growing with purpose.", body: "Our Christian vision and school values will be shared here once the school confirms the approved wording." });
  pages.set("home-learning", { id: "home-learning", title: "Room to wonder. Space to thrive.", body: "A broad, thoughtful education for the whole child — shaped by care, creativity and a little bit of village magic." });
  pages.set("home-church", { id: "home-church", title: "Part of the Hallaton story.", body: "Our Christian foundation is woven through daily life — in the way we care, the way we listen and the way we celebrate each person's worth.\n\nWe share a connection with St Michael & All Angels Church and the wider village. That relationship brings generations together and gives children a sense of being part of something bigger." });
  pages.set("home-news", { id: "home-news", title: "A little school news.", body: "The latest from our school community. News and dates are managed by the school team." });
  pages.set("home-practical", { id: "home-practical", title: "Good to know. Easy to find.", body: "We're happy to help with the practical questions — and even happier to show you around." });
  pages.set("home-contact", { id: "home-contact", title: "Come see what we can grow.", body: "Questions, a curious child or just passing by? Our school office would be glad to hear from you." });
  pages.set("home-about-card", { id: "home-about-card", title: "Known by name. Ready to grow.", body: "Strong relationships. A community that cheers every child on." });
  pages.set("home-value-0", { id: "home-value-0", title: "Our vision", body: "The school’s approved Christian vision will be shared here." });
  pages.set("home-value-1", { id: "home-value-1", title: "Our values", body: "The school’s agreed values and their meaning will be added here." });
  pages.set("home-value-2", { id: "home-value-2", title: "Our community", body: "How the school lives its vision will be described here." });
  pages.set("home-explore-0", { id: "home-explore-0", title: "Different paths. Equal possibility.", body: "Learning that meets children where they are and helps them find their next step." });
  pages.set("home-explore-1", { id: "home-explore-1", title: "More than the classroom.", body: "Space for imagination, friendship, fresh air and finding what makes you shine." });
  pages.set("home-explore-2", { id: "home-explore-2", title: "Growing side by side.", body: "When families and school share the journey, wonderful things happen." });
  pages.set("home-day", { id: "home-day", title: "From hello to see you soon.", body: "School day timings are being confirmed. Please contact the school office for current start, finish and attendance times." });
  pages.set("home-term", { id: "home-term", title: "Plan a little time together.", body: "Confirmed term dates and holiday information will be published here as soon as they are available." });
  pages.set("home-location", { id: "home-location", title: "Right here in Hallaton village.", body: "Address and visitor information are available from the school office. We'd love to welcome you." });
  pages.set("home-statutory-intro", { id: "home-statutory-intro", title: "School information", body: "Published statutory details are being checked with the school. Until verified, no inspection judgements, funding figures, admission arrangements or performance statistics are shown here." });
  pages.set("home-statutory-note", { id: "home-statutory-note", title: "Statutory information notice", body: "Verified statutory information will be added by the school." });
  pages.set("home-vision-note", { id: "home-vision-note", title: "Vision and values notice", body: "Vision & values · wording to be confirmed" });
  pages.set("home-statutory-ofsted", { id: "home-statutory-ofsted", title: "Ofsted & SIAMS", body: "Verified report links to be added" });
  pages.set("home-statutory-premium", { id: "home-statutory-premium", title: "Pupil Premium & Sports Premium", body: "Current plans and impact reports to be added" });
  pages.set("home-statutory-send", { id: "home-statutory-send", title: "SEND & Local Offer", body: "School and local authority information to be confirmed" });
  pages.set("home-statutory-ks2", { id: "home-statutory-ks2", title: "KS2 performance", body: "Current verified data and official links to be added" });
  pages.set("home-statutory-admissions", { id: "home-statutory-admissions", title: "Admissions", body: "Approved arrangements and application information to be added" });
  pages.set("contact", { id: "contact", title: "Contact us", body: "Ask a question or get in touch about visiting the school. The school team can review your message in the staff portal." });
  for (const section of schoolNavigation) {
    for (const link of [section, ...(section.children ?? [])]) {
      if (!link.href.startsWith("/page?")) continue;
      const id = new URLSearchParams(link.href.split("?")[1]).get("pid");
      if (id) pages.set(id, { id, title: link.label, body: (schoolPageContent[id] ?? (id === "102" ? ["Choose a class to visit its page."] : ["Information for this page is awaiting review."])).join("\n\n") });
    }
  }
  for (const [id, page] of Object.entries(additionalPages)) {
    if (!pages.has(id)) pages.set(id, { id, title: page.title, body: (schoolPageContent[id] ?? ["Information for this page is awaiting review."]).join("\n\n") });
  }
  return [...pages.values()].sort((a, b) => a.title.localeCompare(b.title));
}
