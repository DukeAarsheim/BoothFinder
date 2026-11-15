// Tests for lib/auth/access.ts: who gets into the vendor and organizer pages.
// Run: node --test "lib/auth/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { canEnter,
  findEventsHref, signInPageAction } from "./access.ts";

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

const page = (over) => ({
  hasUser: true,
  expectingSignIn: false,
  signedInAs: null,
  role: "vendor",
  ...over,
});

test("the sign-in page shows the form when nobody is signed in", () => {
  assert.equal(signInPageAction(page({ hasUser: false })), "show-form");
  assert.equal(signInPageAction(page({ hasUser: false, expectingSignIn: true })), "show-form");
});

test("the sign-in page lets someone in right after they sign in", () => {
  assert.equal(signInPageAction(page({ expectingSignIn: true })), "enter");
});

test("someone already signed in for this side goes straight in", () => {
  assert.equal(signInPageAction(page({ signedInAs: "vendor", role: "vendor" })), "enter");
  assert.equal(signInPageAction(page({ signedInAs: "host", role: "host" })), "enter");
});

test("someone signed in for the other side is asked to sign in for this one", () => {
  assert.equal(signInPageAction(page({ signedInAs: "host", role: "vendor" })), "show-form");
  assert.equal(signInPageAction(page({ signedInAs: "vendor", role: "host" })), "show-form");
});

test("a session with no remembered side still shows the form", () => {
  assert.equal(signInPageAction(page({ signedInAs: null })), "show-form");
});

test("a remembered side with no session shows the form, so signing out sticks", () => {
  assert.equal(signInPageAction(page({ hasUser: false, signedInAs: "vendor", role: "vendor" })), "show-form");
});

test("Find events that pay goes straight to the vendor dashboard when signed in for vendor", () => {
  assert.equal(findEventsHref({ hasUser: true, signedInAs: "vendor" }), "/vendor");
});

test("Find events that pay still goes through /start for everyone else", () => {
  assert.equal(findEventsHref({ hasUser: false, signedInAs: "vendor" }), "/start"); // stale marker, no session
  assert.equal(findEventsHref({ hasUser: true, signedInAs: "host" }), "/start"); // signed in for the other side
  assert.equal(findEventsHref({ hasUser: true, signedInAs: null }), "/start"); // session with no remembered side
  assert.equal(findEventsHref({ hasUser: false, signedInAs: null }), "/start");
});
