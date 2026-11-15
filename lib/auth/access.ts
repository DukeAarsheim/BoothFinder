/**
 * The rules for who gets into the vendor and organizer pages. Pure functions,
 * no imports, so the tests can load this file with plain Node
 * (node --test "lib/auth/*.test.mjs").
 *
 * The rule the team asked for: a visitor signs in every time they choose a
 * side. A session left over from earlier is not enough on its own.
 */
export type Side = "vendor" | "host";

/**
 * May this visitor see a page on `role`'s side? Only when they are signed in
 * AND that sign-in was for this side (`signedInAs`, see ./roleSession.ts).
 */
export function canEnter({
  hasUser,
  signedInAs,
  role,
}: {
  hasUser: boolean;
  signedInAs: Side | null;
  role: Side;
}): boolean {
  return hasUser && signedInAs === role;
}

/**
 * What the sign-in page does once it knows whether a session exists.
 * `expectingSignIn` is true only while a sign-in started on this page is
 * finishing (the password was just submitted, or the visitor is coming back
 * from Google or an emailed link).
 *
 * - "show-form": nobody is signed in.
 * - "enter": the sign-in this page started has just succeeded.
 * - "sign-out-first": an older session exists. Drop it, so choosing a side
 *   always means signing in.
 */
export function signInPageAction({
  hasUser,
  expectingSignIn,
}: {
  hasUser: boolean;
  expectingSignIn: boolean;
}): "show-form" | "enter" | "sign-out-first" {
  if (!hasUser) return "show-form";
  return expectingSignIn ? "enter" : "sign-out-first";
}
