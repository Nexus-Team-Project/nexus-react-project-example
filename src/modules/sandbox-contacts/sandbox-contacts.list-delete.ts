/**
 * This file implements list (cursor paging, newest first) and delete for the
 * Contacts API sandbox. Every sandbox contact counts as "not joined", so the
 * delete rules of the real API reduce to found / not found / duplicate.
 */
import { prisma } from "../../db/prisma.js";
import { SandboxApiError } from "./sandbox-contacts.space.js";
import { toView } from "./sandbox-contacts.service.js";
import type { DeleteItem } from "./sandbox-contacts.schemas.js";

/** Opaque cursor: base64url of "<createdAt ms>.<id>". */
function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.getTime()}.${id}`).toString("base64url");
}

/** Parses a cursor or throws 400 invalid_cursor. */
function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  const [ms, id] = Buffer.from(cursor, "base64url").toString("utf8").split(".");
  if (!ms || !/^\d{1,15}$/.test(ms) || !id) throw new SandboxApiError(400, "invalid_cursor", "invalid_cursor");
  return { createdAt: new Date(Number(ms)), id };
}

/** A page of the space's contacts, newest first. */
export async function listContacts(spaceId: string, limit: number, cursor?: string) {
  const after = cursor ? decodeCursor(cursor) : null;
  const rows = await prisma.sandboxContact.findMany({
    where: {
      spaceId,
      ...(after ? { OR: [{ createdAt: { lt: after.createdAt } }, { createdAt: after.createdAt, id: { lt: after.id } }] } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });
  const page = rows.slice(0, limit);
  const columns = await prisma.sandboxColumn.findMany({ where: { spaceId } });
  const last = page[page.length - 1];
  return {
    data: page.map((c) => toView(c, columns)),
    nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null,
  };
}

/** Deletes the named contacts; per-item results in request order. */
export async function deleteContacts(spaceId: string, items: DeleteItem[]) {
  const ids = items.flatMap((i) => ("tenantContactId" in i ? [i.tenantContactId] : []));
  const exts = items.flatMap((i) => ("externalId" in i ? [i.externalId] : []));
  const found = await prisma.sandboxContact.findMany({
    where: { spaceId, OR: [{ id: { in: ids } }, { externalId: { in: exts } }] },
    select: { id: true, externalId: true },
  });
  const seen = new Set<string>();
  const results = items.map((item, index) => {
    const hit = "tenantContactId" in item ? found.find((c) => c.id === item.tenantContactId) : found.find((c) => c.externalId === item.externalId);
    if (!hit) return { index, status: "not_found" as const };
    if (seen.has(hit.id)) return { index, status: "duplicate_in_batch" as const, tenantContactId: hit.id };
    seen.add(hit.id);
    return { index, status: "deleted" as const, tenantContactId: hit.id };
  });
  if (seen.size) await prisma.sandboxContact.deleteMany({ where: { spaceId, id: { in: [...seen] } } });
  const count = (s: string) => results.filter((r) => r.status === s).length;
  return {
    summary: { deleted: count("deleted"), skipped: 0, notFound: count("not_found"), failed: count("duplicate_in_batch") },
    results,
  };
}

/** Counts (dryRun) or deletes every contact of the space - all were created by this key. */
export async function deleteAllContacts(spaceId: string, dryRun: boolean) {
  const matched = await prisma.sandboxContact.count({ where: { spaceId } });
  const deleted = dryRun || matched === 0 ? 0 : (await prisma.sandboxContact.deleteMany({ where: { spaceId } })).count;
  return { dryRun, matched, deleted };
}
