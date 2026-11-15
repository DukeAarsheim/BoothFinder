// Tests for lib/auth/access.ts: who gets into the vendor and organizer pages.
// Run: node --test "lib/auth/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { canEnter, signInPageAction } from "./access.ts";

test("canEnter lets in someone signed in for this side", () => {
  assert.equal(canEnter({ hasUser: true, signedInAs: "vendor", role: "vendor" }), true);
});

test("canEnter keeps out someone who is not signed in", () => {
  assert.equal(canEnter({ hasUser: false, signedInAs: null, role: "vendor" }), false);
});

test("canEnter keeps out someone signed in for the other side", () => {
  assert.equal(canEnter({ hasUser: true, signedInAs: "host", role: "vendor" }), false);
  assert.equal(canEnter({ hasUser: true, signedInAs: "vendor", role: "host" }), false);
});

test("canEnter keeps out a session with no record of which side it signed in for", () => {
  assert.equal(canEnter({ hasUser: true, signedInAs: null, role: "host" }), false);
});

test("canEnter ignores a leftover side when nobody is signed in", () => {
  assert.equal(canEnter({ hasUser: false, signedInAs: "host", role: "host" }), false);
});

test("the sign-in page shows the form when nobody is signed in", () => {
  assert.equal(signInPageAction({ hasUser: false, expectingSignIn: false }), "show-form");
  assert.equal(signInPageAction({ hasUser: false, expectingSignIn: true }), "show-form");
});

test("the sign-in page lets someone in right after they sign in", () => {
  assert.equal(signInPageAction({ hasUser: true, expectingSignIn: true }), "enter");
});

test("an existing session shows the form without revoking a Google session", () => {
  assert.equal(signInPageAction({ hasUser: true, expectingSignIn: false }), "show-form");
});
