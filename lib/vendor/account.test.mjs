import assert from "node:assert/strict";
import test from "node:test";
import { isValidEmail, normalizeWebsite } from "./account.ts";

test("emails: needs an @ and a dot after it, no spaces", () => {
  assert.equal(isValidEmail("you@yourbrand.com"), true);
  assert.equal(isValidEmail("  you@yourbrand.com  "), true);
  assert.equal(isValidEmail("you@yourbrand"), false);
  assert.equal(isValidEmail("you yourbrand.com"), false);
  assert.equal(isValidEmail(""), false);
});

test("websites: empty is fine, a missing scheme is added, junk is rejected", () => {
  assert.equal(normalizeWebsite(""), "");
  assert.equal(normalizeWebsite("   "), "");
  assert.equal(normalizeWebsite("juicebar.com"), "https://juicebar.com");
  assert.equal(normalizeWebsite("http://juicebar.com/menu"), "http://juicebar.com/menu");
  assert.equal(normalizeWebsite("not a website"), null);
  assert.equal(normalizeWebsite("localhost"), null);
});
