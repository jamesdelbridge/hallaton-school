import assert from "node:assert/strict";
import test from "node:test";
import { classPageLinks, schoolPageId } from "../lib/class-navigation";
import { additionalPages } from "../lib/school-additional-pages";
import { customNavigationTargets } from "../lib/website-navigation";
import { defaultRelatedNavigation, readRelatedNavigation, relatedNavigationInput } from "../lib/website-related-navigation";

test("default related links preserve existing parent and page destinations", () => {
  const sections = defaultRelatedNavigation();
  assert.equal(relatedNavigationInput.safeParse(sections).success, true);
  for (const [id, page] of Object.entries(additionalPages)) {
    const section = sections.find((item) => schoolPageId(item.href) === page.parent);
    assert.ok(section?.children?.some((child) => schoolPageId(child.href) === id && child.label === page.title));
  }
  assert.deepEqual(readRelatedNavigation("[]"), []);
  assert.deepEqual(classPageLinks([]), []);
});

test("related links require unique school-page sections and track custom targets", () => {
  const sections = [{ label: "Parent", href: "/page?pid=custom-parent", children: [{ label: "Club", href: "/page?pid=custom-club" }] }];
  assert.equal(relatedNavigationInput.safeParse(sections).success, true);
  assert.deepEqual(customNavigationTargets(JSON.stringify(sections), true), ["custom-parent", "custom-club"]);
  assert.equal(relatedNavigationInput.safeParse([...sections, { ...sections[0], label: "Duplicate" }]).success, false);
  assert.equal(relatedNavigationInput.safeParse([{ label: "Not a page", href: "/contact" }]).success, false);
  assert.equal(relatedNavigationInput.safeParse([]).success, true);
});
