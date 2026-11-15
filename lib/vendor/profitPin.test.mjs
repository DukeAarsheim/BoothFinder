// Tests for lib/vendor/profitPin.ts: the number on a map pin.
// Run: node --test "lib/vendor/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { profitPinLabel } from "./profitPin.ts";

test("positive profit is a green +$ label, negative is a red −$ label", () => {
  assert.deepEqual(profitPinLabel(820), { text: "+$820", tone: "gain" });
  assert.deepEqual(profitPinLabel(-150), { text: "−$150", tone: "loss" });
});

test("rounds for display only: under $100 to the dollar, otherwise the nearest $10", () => {
  assert.equal(profitPinLabel(42.6).text, "+$43");
  assert.equal(profitPinLabel(-99.4).text, "−$99");
  assert.equal(profitPinLabel(823).text, "+$820");
  assert.equal(profitPinLabel(-1544).text, "−$1,540");
});

test("large amounts are shortened so the pin stays small", () => {
  assert.equal(profitPinLabel(12_400).text, "+$12.4k");
  assert.equal(profitPinLabel(-25_000).text, "−$25k");
});

test("a profit that rounds to nothing reads $0, and no estimate gives no label", () => {
  assert.deepEqual(profitPinLabel(0.3), { text: "$0", tone: "gain" });
  assert.equal(profitPinLabel(null), null);
  assert.equal(profitPinLabel(undefined), null);
  assert.equal(profitPinLabel(Number.NaN), null);
});
