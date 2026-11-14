/**
 * The two sides of BoothFinder, as used by the demo sign-in step (/signin/[role]).
 * There are no real accounts (MASTER.md §2): signing in only routes the visitor
 * to their side of the app.
 */
export const SIGN_IN_ROLES = {
  vendor: {
    label: "Vendor",
    heading: "Sign in to your vendor account",
    blurb: "Find events, compare booth fees, and see which ones are worth it.",
    destination: "/vendor",
  },
  host: {
    label: "Event Host",
    heading: "Sign in to your event host account",
    blurb: "List your event and reach food and drink brands that fit.",
    // The organizer dashboard is the host's home. /host stays reachable by address.
    destination: "/host/dashboard",
  },
} as const;

export type SignInRole = keyof typeof SIGN_IN_ROLES;

export function isSignInRole(value: string): value is SignInRole {
  return value in SIGN_IN_ROLES;
}
