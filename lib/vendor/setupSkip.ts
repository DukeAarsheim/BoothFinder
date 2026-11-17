"use client";

/**
 * Remembers, for this browser session, that a vendor without a finished account
 * has been shown the setup page (or chose "Skip for now"). From then on they can
 * open the other pages, where events show with no profit numbers. The next
 * session opens the setup page first again until they finish it. Cleared when
 * they sign out.
 */
const KEY = "bf-setup-skipped"; // sessionStorage

export function hasSkippedSetup(): boolean {
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setSkippedSetup(skipped: boolean) {
  try {
    if (skipped) window.sessionStorage.setItem(KEY, "1");
    else window.sessionStorage.removeItem(KEY);
  } catch {
    // Without storage the vendor is simply sent to setup again.
  }
}
