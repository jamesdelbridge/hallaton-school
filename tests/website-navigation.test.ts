import assert from "node:assert/strict";
import test from "node:test";
import { schoolNavigation } from "../lib/school-navigation";
import { navigationInput, readNavigation } from "../lib/website-navigation";

test("the existing school menu is the valid default", () => {
  assert.equal(navigationInput.safeParse(schoolNavigation).success, true);
  assert.deepEqual(readNavigation(null), schoolNavigation);
});

test("navigation only accepts known local school destinations", () => {
  for (const href of ["https://example.test", "//example.test", "/staff", "/page?pid=missing", "/page?pid=36&pid=49", "/page?pid=36#x", "/\\example.test"]) {
    assert.equal(navigationInput.safeParse([{ label: "Example", href }]).success, false, href);
  }
  assert.equal(navigationInput.safeParse([{ label: "Values", href: "/page?pid=36" }]).success, true);
  assert.equal(navigationInput.safeParse([{ label: "New page", href: "/page?pid=custom-after-school" }]).success, true);
  for (const href of ["/page?pid=custom-", "/page?pid=custom-a--b", "/page?pid=custom-ABC"]) {
    assert.equal(navigationInput.safeParse([{ label: "New page", href }]).success, false, href);
  }
});
