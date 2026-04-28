/** This file normalizes user-entered strings before validation and lookup. */

/** Lowercases and trims an email address for case-insensitive matching. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Keeps only phone-safe characters and limits the result to a short value. */
export function normalizePhone(phone: string): string {
  return phone.trim().replace(/[^\d+()-]/g, "").slice(0, 32);
}
