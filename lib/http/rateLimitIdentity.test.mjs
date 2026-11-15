import assert from "node:assert/strict";
import { test } from "node:test";
import { rateLimitBucket } from "./rateLimitIdentity.ts";

test("Vercel client addresses get stable, non-plaintext buckets", () => {
  const a = new Request("https://example.com", { headers: { "x-vercel-forwarded-for": "8.8.8.8" } });
  const b = new Request("https://example.com", { headers: { "x-vercel-forwarded-for": "1.1.1.1" } });
  const key = rateLimitBucket(a, "test-secret", true);
  assert.match(key, /^[a-f0-9]{64}$/);
  assert.equal(key, rateLimitBucket(a, "test-secret", true));
  assert.notEqual(key, rateLimitBucket(b, "test-secret", true));
  assert.notEqual(key, rateLimitBucket(a, "different-secret", true));
});

test("missing or malformed Vercel addresses fail closed", () => {
  assert.equal(rateLimitBucket(new Request("https://example.com"), "test-secret", true), null);
  assert.equal(rateLimitBucket(new Request("https://example.com", { headers: { "x-vercel-forwarded-for": "not-an-ip" } }), "test-secret", true), null);
});

test("untrusted proxy headers outside Vercel do not create separate buckets", () => {
  const a = new Request("http://localhost", { headers: { "x-vercel-forwarded-for": "8.8.8.8" } });
  const b = new Request("http://localhost", { headers: { "x-vercel-forwarded-for": "1.1.1.1" } });
  assert.equal(rateLimitBucket(a, "test-secret", false), rateLimitBucket(b, "test-secret", false));
});
