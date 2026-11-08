import { strict as assert } from "node:assert";
import { test } from "node:test";
import { schoolNavigation } from "../lib/school-navigation";
import { localSchoolLink } from "../lib/local-school-link";
import { schoolPageContent } from "../lib/school-page-content";
import { additionalPages } from "../lib/school-additional-pages";

test("school menu stays on the current origin", () => {
  for (const section of schoolNavigation) {
    for (const item of [section, ...(section.children ?? [])]) {
      assert.ok(item.href.startsWith("/") && !item.href.startsWith("//"), `${item.label}: ${item.href}`);
    }
  }
});

test("additional pages have original demonstration summaries", () => {
  for (const [pid, page] of Object.entries(additionalPages)) {
    assert.ok(schoolPageContent[pid]?.length, `${page.title} has no summary`);
  }
});

test("each menu page has a demonstration summary", () => {
  for (const section of schoolNavigation) {
    for (const item of [section, ...(section.children ?? [])]) {
      if (!item.href.startsWith("/page?")) continue;
      const pid = new URL(item.href, "http://localhost").searchParams.get("pid");
      assert.ok(pid === "102" || (pid && schoolPageContent[pid]?.length), `${item.label} has no summary`);
    }
  }
});

test("legacy school links use local routes except direct PDFs", () => {
  assert.equal(localSchoolLink("https://www.hallatonprimary.co.uk/page/?title=Oak+Class&pid=106"), "/page?title=Oak+Class&pid=106");
  assert.equal(localSchoolLink("https://hallatonprimary.co.uk/news/?pid=14"), "/#news");
  assert.equal(localSchoolLink("https://www.hallatonprimary.co.uk/docs/report.PDF?version=1"), "https://www.hallatonprimary.co.uk/docs/report.PDF?version=1");
  assert.equal(localSchoolLink("https://www.hallatonprimary.co.uk/attachments/download.asp?file=812&type=pdf"), "https://www.hallatonprimary.co.uk/attachments/download.asp?file=812&type=pdf");
  assert.equal(localSchoolLink("https://example.org/report.pdf"), "https://example.org/report.pdf");
});
