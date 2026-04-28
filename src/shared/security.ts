/** This file hashes and redacts sensitive values before storage or logging. */
import { createHash, randomBytes } from "node:crypto";

const sensitiveKeys = new Set([
  "authorization",
  "token",
  "apiKey",
  "api_key",
  "signature",
  "password",
  "secret",
  "card",
  "cvv",
]);

/** Hashes bearer tokens and benefit codes so plaintext values are not stored. */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Creates a random opaque token for local seed data and manual testing. */
export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Redacts known sensitive fields from nested provider payloads. */
export function redactSensitive(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map((item) => redactSensitive(item));
  }

  if (input !== null && typeof input === "object") {
    const redacted: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(input)) {
      const normalizedKey = key.toLowerCase();
      const isSensitive = [...sensitiveKeys].some((sensitive) => normalizedKey.includes(sensitive));
      redacted[key] = isSensitive ? "[REDACTED]" : redactSensitive(value);
    }

    return redacted;
  }

  return input;
}
