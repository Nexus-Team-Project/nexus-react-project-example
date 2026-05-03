/** This file stores demo session and one-time barcode reveal state in the browser. */
import type { Session } from "./types";

const SESSION_STORAGE_KEY = "nexus-demo-session";
const SEEN_BARCODES_STORAGE_KEY = "nexus-demo-seen-first-barcodes";

/** Reads the last logged-in session so refresh does not force another login. */
export function readStoredSession(): Session | null {
  const rawSession = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!rawSession) {
    return null;
  }

  try {
    const session = JSON.parse(rawSession) as Session;
    return new Date(session.expiresAt) > new Date() ? session : null;
  } catch {
    return null;
  }
}

/** Stores the current session for refresh-only persistence in this browser tab. */
export function writeStoredSession(session: Session): void {
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

/** Clears the stored session when the user logs out. */
export function clearStoredSession(): void {
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

/** Reads purchases that already had their one-time barcode reveal. */
export function readSeenBarcodeIds(userEmail: string): Set<string> {
  const rawIds = window.localStorage.getItem(`${SEEN_BARCODES_STORAGE_KEY}:${userEmail}`);
  if (!rawIds) {
    return new Set<string>();
  }

  try {
    const ids = JSON.parse(rawIds) as string[];
    return new Set(ids.filter((id) => typeof id === "string"));
  } catch {
    return new Set<string>();
  }
}

/** Stores purchases that should not show the first-visible barcode again. */
export function writeSeenBarcodeIds(userEmail: string, ids: Set<string>): void {
  window.localStorage.setItem(`${SEEN_BARCODES_STORAGE_KEY}:${userEmail}`, JSON.stringify([...ids]));
}
