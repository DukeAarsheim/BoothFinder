// Tests for lib/nav/backTrail.ts: where the Back button goes.
// Run: node --test "lib/nav/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { backTarget, isSkipped, recordVisit } from "./backTrail.ts";

test("sign-in screens are skipped, other pages are not", () => {
  assert.equal(isSkipped("/signin/host"), true);
  assert.equal(isSkipped("/signin/vendor"), true);
  assert.equal(isSkipped("/start"), false);
  assert.equal(isSkipped("/host/dashboard"), false);
});

test("recordVisit adds a page once", () => {
  assert.deepEqual(recordVisit(["/"], "/start"), ["/", "/start"]);
  assert.deepEqual(recordVisit(["/", "/start"], "/start"), ["/", "/start"]);
});

test("Back from the dashboard skips the sign-in screen", () => {
  const trail = ["/", "/start", "/signin/host", "/host/dashboard"];
  assert.deepEqual(backTarget(trail, "/host/dashboard"), { target: "/start", trail: ["/", "/start"] });
});

test("Back skips a sign-in screen visited twice (Google round trip)", () => {
  const trail = ["/start", "/signin/vendor", "/signin/vendor", "/vendor"];
  assert.equal(backTarget(trail, "/vendor")?.target, "/start");
});

test("Back goes to the ordinary previous page", () => {
  const trail = ["/vendor", "/vendor/fit"];
  assert.equal(backTarget(trail, "/vendor/fit")?.target, "/vendor");
});

test("pressing Back twice keeps going further back", () => {
  const first = backTarget(["/", "/start", "/signin/host", "/host/dashboard", "/host"], "/host");
  assert.equal(first?.target, "/host/dashboard");
  const second = backTarget(first.trail, "/host/dashboard");
  assert.equal(second?.target, "/start");
});

test("nothing to go back to", () => {
  assert.equal(backTarget([], "/vendor"), null);
  assert.equal(backTarget(["/vendor"], "/vendor"), null);
  assert.equal(backTarget(["/signin/host", "/host/dashboard"], "/host/dashboard"), null);
});
