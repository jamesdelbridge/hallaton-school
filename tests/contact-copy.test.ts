import assert from "node:assert/strict";
import test from "node:test";
import { contactCopyInput, defaultContactCopy, readContactCopy } from "../lib/contact-copy";

test("contact form wording is validated and older values get defaults", () => {
  assert.deepEqual(readContactCopy(null), defaultContactCopy);
  assert.equal(contactCopyInput.safeParse({ ...defaultContactCopy, privacyNotice: "" }).success, false);
  assert.equal(contactCopyInput.safeParse({ ...defaultContactCopy, unknown: "x" }).success, false);
  assert.equal(contactCopyInput.parse({ nameLabel: "Name" }).safeguardingNotice, defaultContactCopy.safeguardingNotice);
});
