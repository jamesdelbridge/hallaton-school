import { strict as assert } from "node:assert";
import { test } from "node:test";
import { socialLinkInput } from "../lib/social-links";

test("disabled empty social links are valid", () => {
  assert.equal(socialLinkInput.safeParse({ platform: "Instagram", url: "", enabled: false }).success, true);
  assert.equal(socialLinkInput.safeParse({ platform: "Instagram", url: "", enabled: true }).success, false);
});

test("social links must use the matching official HTTPS host", () => {
  assert.equal(socialLinkInput.safeParse({ platform: "Instagram", url: "https://www.instagram.com/school/", enabled: true }).success, true);
  for (const url of ["http://instagram.com/school", "https://instagram.com.example.org/school", "https://facebook.com/school", "https://user:pass@instagram.com/school"]) {
    assert.equal(socialLinkInput.safeParse({ platform: "Instagram", url, enabled: true }).success, false, url);
  }
});
