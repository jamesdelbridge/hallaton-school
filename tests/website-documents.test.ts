import assert from "node:assert/strict";
import test from "node:test";
import { defaultDocuments, documentList, readDocuments } from "../lib/website-documents";

test("existing PDFs remain available until explicitly replaced", () => {
  const original = defaultDocuments("49");
  assert.ok(original.length > 0);
  assert.deepEqual(readDocuments(null, "49"), original);
  assert.deepEqual(readDocuments("[]", "49"), []);
});

test("document links require safe HTTPS PDF URLs", () => {
  assert.equal(documentList.safeParse([{ title: "Term dates", url: "https://example.test/term.pdf" }]).success, true);
  assert.equal(documentList.safeParse([{ title: "Old link", url: "https://example.test/download?type=pdf" }]).success, true);
  for (const url of ["javascript:alert(1)", "http://example.test/file.pdf", "https://example.test/page"]) {
    assert.equal(documentList.safeParse([{ title: "Bad link", url }]).success, false);
  }
});
