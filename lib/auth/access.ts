/**
 * The rules for who gets into the vendor and organizer pages. Pure functions,
 * no imports, so the tests can load this file with plain Node
 * (node --test "lib/auth/*.test.mjs").
 *
 * The rule: a visitor must be signed in for a side to use it. Signing in for a
 * side is remembered in the browser (./roleSession.ts), so going back to the
 * home page and choosing that side again goes straight in. Signing out forgets
 * it, and a visitor who is not signed in, or signed in for the other side, is
 * asked to sign in.
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
 * - "enter": the sign-in this page started has just succeeded, or the visitor
 *   is already signed in for this side (`signedInAs`, see `canEnter`).
 * - "show-form": everyone else. A session for the other side, or one with no
 *   remembered side, doesn't skip the form, and it is never revoked from here:
 *   other tabs and devices may be using it.
 */
export function signInPageAction({
  hasUser,
  expectingSignIn,
  signedInAs,
  role,
}: {
  hasUser: boolean;
  expectingSignIn: boolean;
  signedInAs: Side | null;
  role: Side;
}): "show-form" | "enter" {
  if (!hasUser) return "show-form";
  return expectingSignIn || canEnter({ hasUser, signedInAs, role }) ? "enter" : "show-form";
}
