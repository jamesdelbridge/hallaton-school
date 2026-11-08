import assert from "node:assert/strict";
import test from "node:test";
import { classPageLinks, isClassCardId, schoolPageId } from "../lib/class-navigation";

test("class index follows the edited class menu regardless of its label", () => {
  const sections = [{ label: "Classes", href: "/page?pid=102", children: [
    { label: "New class", href: "/page?pid=custom-class" },
    { label: "Oak", href: "/page?pid=106" },
  ] }];
  assert.deepEqual(classPageLinks(sections), sections[0].children);
  assert.equal(schoolPageId(sections[0].children[0].href), "custom-class");
  assert.deepEqual(classPageLinks([]), []);
  assert.equal(schoolPageId("/contact"), null);
  assert.equal(isClassCardId("class-card-custom-class"), true);
  assert.equal(isClassCardId("class-card-104"), true);
  assert.equal(isClassCardId("class-card-../private"), false);
});
