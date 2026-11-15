import assert from "node:assert/strict";
import { test } from "node:test";
import { assertPublicUrl, isPublicAddress, resolvePublic } from "./publicFetch.ts";

test("rejects private, loopback, link-local, mapped and reserved addresses", () => {
  for (const ip of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "172.16.0.1", "192.168.1.1", "100.64.0.1", "198.18.0.1", "::1", "fc00::1", "fe80::1", "::ffff:127.0.0.1", "2001:db8::1"]) {
    assert.equal(isPublicAddress(ip), false, ip);
  }
  assert.equal(isPublicAddress("8.8.8.8"), true);
  assert.equal(isPublicAddress("2606:4700:4700::1111"), true);
});

test("rejects private URL forms and credentials before connecting", () => {
  for (const url of ["http://localhost.", "http://127.1", "http://169.254.169.254", "http://[::1]", "http://user:pass@example.com", "file:///etc/passwd", "http://host.internal"]) {
    assert.throws(() => assertPublicUrl(url), undefined, url);
  }
  assert.equal(assertPublicUrl("https://example.com/event").hostname, "example.com");
});

test("rejects private and mixed DNS answers, and pins a public address", async () => {
  const url = assertPublicUrl("https://example.com/event");
  const signal = AbortSignal.timeout(1000);
  await assert.rejects(resolvePublic(url, signal, async () => [{ address: "127.0.0.1", family: 4 }]));
  await assert.rejects(resolvePublic(url, signal, async () => [{ address: "8.8.8.8", family: 4 }, { address: "10.0.0.1", family: 4 }]));
  assert.deepEqual(await resolvePublic(url, signal, async () => [{ address: "8.8.8.8", family: 4 }]), { address: "8.8.8.8", family: 4 });
});
