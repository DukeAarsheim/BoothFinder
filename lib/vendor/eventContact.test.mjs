import { test } from "node:test";
import assert from "node:assert/strict";
import { organizerEmail, organizerMailto, eventWebUrl } from "./eventContact.ts";

test("missing or invalid organizer contact never produces an email action", () => {
  for (const value of [null, undefined, "", "not an email", "a@example.com\r\nBcc:other@example.com", "a@example.com?bcc=x@y.com"]) {
    assert.equal(organizerMailto(value, "Fair"), null);
  }
  assert.equal(organizerEmail(" organizer@example.com "), "organizer@example.com");
});
test("event names and plus-addresses cannot add mail headers", () => {
  const url = organizerMailto("organizer+vendors@example.com", "Fair & market?bcc=other@example.com\n2027");
  assert.ok(url.startsWith("mailto:organizer%2Bvendors%40example.com?"));
  const query = new URLSearchParams(url.split("?")[1]);
  assert.deepEqual([...query.keys()], ["subject", "body"]);
  assert.equal(query.get("subject"), "Vendor inquiry: Fair & market?bcc=other@example.com\n2027");
});
test("source and application actions reject executable protocols", () => {
  for (const value of [null, "javascript:alert(1)", "data:text/html,hi", "/relative", "mailto:a@example.com"]) assert.equal(eventWebUrl(value), null);
  assert.equal(eventWebUrl("https://example.com/apply"), "https://example.com/apply");
});
