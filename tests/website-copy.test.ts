import assert from "node:assert/strict";
import test from "node:test";
import { defaultWebsiteCopy, readWebsiteCopy, websiteCopyInput } from "../lib/website-copy";

test("homepage labels have validated draftable defaults", () => {
  assert.deepEqual(readWebsiteCopy(null), defaultWebsiteCopy);
  assert.equal(websiteCopyInput.safeParse({ ...defaultWebsiteCopy, welcomeText: "Welcome families" }).success, true);
  assert.equal(websiteCopyInput.safeParse({ ...defaultWebsiteCopy, welcomeText: "" }).success, false);
  assert.equal(websiteCopyInput.safeParse({ ...defaultWebsiteCopy, unexpected: "value" }).success, false);
  assert.equal(websiteCopyInput.parse({ welcomeText: "Welcome families" }).heroDiscover, defaultWebsiteCopy.heroDiscover);
});

test("school-page labels default safely for existing website drafts", () => {
  const { schoolPageEyebrow: _newLabel, schoolPageNotice: _newNotice, ...oldCopy } = defaultWebsiteCopy;
  const copy = readWebsiteCopy(JSON.stringify(oldCopy));
  assert.equal(copy.schoolPageEyebrow, defaultWebsiteCopy.schoolPageEyebrow);
  assert.equal(copy.schoolPageNotice, defaultWebsiteCopy.schoolPageNotice);
  assert.equal(websiteCopyInput.safeParse({ ...copy, schoolDocumentsTitle: "" }).success, false);
  assert.equal(websiteCopyInput.safeParse({ ...copy, schoolPageNotice: "Approved wording" }).success, true);
});
