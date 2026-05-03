/** This file hashes, verifies, and redacts sensitive values before storage or logging. */
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const PASSWORD_HASH_PREFIX = "scrypt";
const PASSWORD_KEY_LENGTH = 64;

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

/** Hashes a password with a random salt so plaintext passwords are never stored. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = await scryptAsync(password, salt, PASSWORD_KEY_LENGTH);
  if (!Buffer.isBuffer(derivedKey)) {
    throw new Error("Password hash generation failed");
  }

  return `${PASSWORD_HASH_PREFIX}$${salt}$${derivedKey.toString("base64url")}`;
}

/** Verifies a password against the stored scrypt hash without exposing timing differences. */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [prefix, salt, encodedKey] = storedHash.split("$");
  if (prefix !== PASSWORD_HASH_PREFIX || !salt || !encodedKey) {
    return false;
  }

  const expectedKey = Buffer.from(encodedKey, "base64url");
  const derivedKey = await scryptAsync(password, salt, expectedKey.length);
  if (!Buffer.isBuffer(derivedKey) || derivedKey.length !== expectedKey.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, expectedKey);
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
