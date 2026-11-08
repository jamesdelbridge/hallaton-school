import { strict as assert } from "node:assert";
import { test } from "node:test";
import { popupImageType, popupInput } from "../lib/website-popup";

const valid = { tagline: "A school", imageAlt: "A football match", linkUrl: "https://files.ofsted.gov.uk/v1/file/50316629", linkLabel: "Ofsted report", startsAt: "2026-11-07T12:00:00.000Z", endsAt: "2026-11-08T12:00:00.000Z", enabled: true };

test("validates popup link and schedule", () => {
  assert.equal(popupInput.safeParse(valid).success, true);
  assert.equal(popupInput.safeParse({ ...valid, linkUrl: "/contact" }).success, true);
  for (const linkUrl of ["javascript:alert(1)", "//example.org", "/\\example.org", "http://example.org", "https://user:pass@example.org"]) assert.equal(popupInput.safeParse({ ...valid, linkUrl }).success, false);
  assert.equal(popupInput.safeParse({ ...valid, endsAt: valid.startsAt }).success, false);
  assert.equal(popupInput.safeParse({ ...valid, endsAt: "invalid" }).success, false);
});

test("recognizes supported image signatures", () => {
  assert.equal(popupImageType(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])), "image/png");
  assert.equal(popupImageType(Uint8Array.from([255, 216, 255])), "image/jpeg");
  assert.equal(popupImageType(Buffer.from("RIFF1234WEBP")), "image/webp");
  assert.equal(popupImageType(Buffer.from("<svg>")), null);
});
