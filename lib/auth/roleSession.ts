"use client";

import type { Side } from "./access";

/**
 * Remembers, in this browser, which side the visitor signed in for. Supabase
 * keeps the session itself; it has no idea whether that sign-in happened on
 * the vendor page or the organizer page, so we note it here.
 *
 * These are convenience markers, not security: the data behind each page is
 * protected by the database's own rules, not by these keys.
 */
const SIGNED_IN_AS = "bf-signed-in-as"; // localStorage: lasts as long as the session
const SIGNING_IN_AS = "bf-signing-in-as"; // sessionStorage: survives the trip to Google and back

const isSide = (value: string | null): value is Side => value === "vendor" || value === "host";

function read(storage: "localStorage" | "sessionStorage", key: string): Side | null {
  try {
    const value = window[storage].getItem(key);
    return isSide(value) ? value : null;
  } catch {
    return null; // private windows can block storage
  }
}

function write(storage: "localStorage" | "sessionStorage", key: string, value: Side | null) {
  try {
    if (value) window[storage].setItem(key, value);
    else window[storage].removeItem(key);
  } catch {
    // Nothing to do: without storage the visitor is simply asked to sign in again.
  }
}

/** The side the current session signed in for, or null. */
export const getSignedInSide = () => read("localStorage", SIGNED_IN_AS);
export const setSignedInSide = (side: Side | null) => write("localStorage", SIGNED_IN_AS, side);

/** The side of a sign-in that left for Google and has not come back yet. */
export const getPendingSide = () => read("sessionStorage", SIGNING_IN_AS);
export const setPendingSide = (side: Side | null) => write("sessionStorage", SIGNING_IN_AS, side);
