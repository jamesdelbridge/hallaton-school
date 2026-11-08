import assert from "node:assert/strict";
import test from "node:test";
import { defaultWebsiteIdentity, readWebsiteIdentity, websiteIdentityInput } from "../lib/website-identity";

test("website identity validates public contact and image details", () => {
  assert.deepEqual(readWebsiteIdentity(null), defaultWebsiteIdentity);
  assert.equal(websiteIdentityInput.safeParse({ ...defaultWebsiteIdentity, logoUrl: "http://example.test/logo.png" }).success, false);
  assert.equal(websiteIdentityInput.safeParse({ ...defaultWebsiteIdentity, logoUrl: "https://user:password@example.test/logo.png" }).success, false);
  assert.equal(websiteIdentityInput.safeParse({ ...defaultWebsiteIdentity, email: "not-an-email" }).success, false);
  assert.equal(websiteIdentityInput.safeParse({ ...defaultWebsiteIdentity, email: "school@example.test" }).success, true);
  const { openSearch: _openSearch, searchNoResults: _searchNoResults, ...olderIdentity } = defaultWebsiteIdentity;
  assert.equal(readWebsiteIdentity(JSON.stringify(olderIdentity)).openSearch, "Open search");
  assert.equal(readWebsiteIdentity(JSON.stringify(olderIdentity)).searchNoResults, defaultWebsiteIdentity.searchNoResults);
  assert.equal(websiteIdentityInput.safeParse({ ...defaultWebsiteIdentity, mainNavigation: "" }).success, false);
  assert.equal(websiteIdentityInput.safeParse({ ...defaultWebsiteIdentity, homepageDescription: "" }).success, false);
  assert.equal(websiteIdentityInput.safeParse({ ...defaultWebsiteIdentity, heroBackground: "url(https://example.test)" }).success, false);
  assert.equal(readWebsiteIdentity(JSON.stringify({ ...olderIdentity, heroBackground: "#fff9eb" })).heroBackground, "#fff9eb");
});
