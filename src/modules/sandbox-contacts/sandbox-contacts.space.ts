/**
 * This file resolves the private sandbox space of a docs visitor's key and
 * cleans expired spaces. Any `nxk_test_sandbox_<random>` key gets its own
 * space on first use (stored as sha256), deleted 24h after creation. New
 * spaces are limited per IP so key resetting cannot flood the database.
 */
import { createHash } from "node:crypto";
import { prisma } from "../../db/prisma.js";

export const SANDBOX_KEY_RE = /^nxk_test_sandbox_[A-Za-z0-9_-]{16,64}$/;
const SPACE_TTL_MS = 24 * 60 * 60 * 1000;
const NEW_SPACES_PER_IP_PER_HOUR = 10;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

/** An error answered in the real Contacts API shape: { error, code }. */
export class SandboxApiError extends Error {
  public constructor(public readonly statusCode: number, public readonly code: string, message: string) {
    super(message);
  }
}

/** The bearer key of a request when it is a well-formed sandbox key, else null. */
export function readSandboxKey(authorization: string | undefined): string | null {
  if (!authorization?.startsWith("Bearer ")) return null;
  const key = authorization.slice(7).trim();
  return SANDBOX_KEY_RE.test(key) ? key : null;
}

/** sha256 hex of a key (the raw key is never stored). */
function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * The space id for this request's key, creating the space on first use.
 * Throws 401 missing_api_key when no Bearer key is sent, 401 invalid_api_key
 * for a malformed one (same as the real API), and 429 when this
 * IP already opened too many spaces in the last hour.
 */
export async function resolveSpaceId(authorization: string | undefined, ip: string): Promise<string> {
  const sent = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!sent) throw new SandboxApiError(401, "missing_api_key", "missing_api_key");
  const key = readSandboxKey(authorization);
  if (!key) throw new SandboxApiError(401, "invalid_api_key", "invalid_api_key");
  const keyHash = hashKey(key);
  const now = new Date();

  const existing = await prisma.sandboxSpace.findUnique({ where: { keyHash }, select: { id: true, expiresAt: true } });
  if (existing && existing.expiresAt > now) return existing.id;
  if (existing) await prisma.sandboxSpace.delete({ where: { id: existing.id } }).catch(() => undefined);

  const recent = await prisma.sandboxSpace.count({
    where: { createdIp: ip, createdAt: { gt: new Date(now.getTime() - 60 * 60 * 1000) } },
  });
  if (recent >= NEW_SPACES_PER_IP_PER_HOUR) {
    throw new SandboxApiError(429, "rate_limited", "Too many new sandbox keys from this address - try again in an hour.");
  }
  try {
    const space = await prisma.sandboxSpace.create({
      data: { keyHash, createdIp: ip, expiresAt: new Date(now.getTime() + SPACE_TTL_MS) },
      select: { id: true },
    });
    return space.id;
  } catch {
    // Two first requests with the same key raced: use the space the other one created.
    const raced = await prisma.sandboxSpace.findUnique({ where: { keyHash }, select: { id: true } });
    if (!raced) throw new SandboxApiError(500, "internal_error", "Could not open the sandbox space.");
    return raced.id;
  }
}

/** Deletes every expired space (contacts and columns cascade). */
export async function deleteExpiredSpaces(now: Date = new Date()): Promise<number> {
  const result = await prisma.sandboxSpace.deleteMany({ where: { expiresAt: { lte: now } } });
  return result.count;
}

/** Starts the hourly cleanup of expired sandbox spaces; returns a stop handle. */
export function startSandboxCleanupJob(log: { info: (data: object, msg: string) => void; error: (data: object, msg: string) => void }) {
  const run = () => {
    deleteExpiredSpaces()
      .then((count) => { if (count > 0) log.info({ count }, "Deleted expired contacts sandbox spaces"); })
      .catch((error: unknown) => log.error({ error }, "Contacts sandbox cleanup failed"));
  };
  run();
  const timer = setInterval(run, CLEANUP_INTERVAL_MS);
  return { stop: () => clearInterval(timer) };
}
