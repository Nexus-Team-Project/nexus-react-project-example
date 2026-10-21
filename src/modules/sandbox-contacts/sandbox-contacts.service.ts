/**
 * This file implements the Contacts API sandbox rules, mirroring the real
 * Nexus API: merge on a known person (externalId > email > phone, fill only
 * empty fields, add services), identifier conflicts, in-batch duplicates,
 * custom fields by name or cf_ id (unknown names become text columns, 25
 * max), per-row results. Simplified: no wallet join approvals, all contacts
 * count as "not joined", one space holds at most 1,000 contacts.
 */
import { randomBytes } from "node:crypto";
import type { Prisma, SandboxContact } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { contactInputSchema, SANDBOX_MAX_COLUMNS, SANDBOX_SPACE_MAX_CONTACTS, type ContactInput } from "./sandbox-contacts.schemas.js";

export type RowResult = {
  index: number;
  status: "created" | "merged" | "failed";
  tenantContactId?: string;
  error?: string;
  details?: string[];
  skippedFields?: { field: string; reason: string }[];
};

type Column = { fieldId: string; name: string; normalizedName: string };

/** Column-name matching key: trims, collapses spaces, Hebrew quotes to ASCII, lowercase. */
export function normalizeFieldName(name: string): string {
  return name.replace(/״/g, '"').replace(/׳/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
}

/** Public view of a contact (same shape as the real API). */
export function toView(contact: SandboxContact, columns: Column[]) {
  const nameById = new Map(columns.map((c) => [c.fieldId, c.name]));
  const byName: Record<string, unknown> = {};
  const byId: Record<string, unknown> = {};
  for (const [fieldId, value] of Object.entries((contact.customFields ?? {}) as Record<string, unknown>)) {
    const name = nameById.get(fieldId);
    if (!name) continue;
    byName[name] = value;
    byId[fieldId] = value;
  }
  return {
    tenantContactId: contact.id,
    externalId: contact.externalId,
    firstName: contact.firstName || null,
    lastName: contact.lastName || null,
    email: contact.email,
    phone: contact.phone,
    address: contact.address,
    allowedServices: contact.allowedServices,
    customFields: byName,
    customFieldIds: byId,
    status: "inactive",
    source: "api",
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
  };
}

/** Resolves (and auto-creates) the columns named in a batch; returns key -> column + skip reasons. */
async function resolveColumns(spaceId: string, payloads: Record<string, unknown>[]) {
  const columns = await prisma.sandboxColumn.findMany({ where: { spaceId } });
  const byKey = new Map<string, Column>();
  const skipped = new Map<string, string>();
  for (const key of new Set(payloads.flatMap((p) => Object.keys(p)))) {
    if (/^cf_/.test(key)) {
      const col = columns.find((c) => c.fieldId === key);
      if (col) byKey.set(key, col); else skipped.set(key, "unknown_custom_field");
      continue;
    }
    const normalizedName = normalizeFieldName(key);
    let col = columns.find((c) => c.normalizedName === normalizedName);
    if (!col && normalizedName) {
      if (columns.length >= SANDBOX_MAX_COLUMNS) { skipped.set(key, "custom_field_limit_reached"); continue; }
      const data = { spaceId, fieldId: `cf_${randomBytes(6).toString("hex")}`, name: key.trim().slice(0, 50), normalizedName };
      col = await prisma.sandboxColumn.create({ data }).catch(() => prisma.sandboxColumn.findFirstOrThrow({ where: { spaceId, normalizedName } }));
      columns.push(col);
    }
    if (col) byKey.set(key, col); else skipped.set(key, "unknown_custom_field");
  }
  return { columns, byKey, skipped };
}

/** True when a stored value counts as empty for the fill-only merge. */
const empty = (v: unknown) => v === undefined || v === null || v === "";

/** Create or merge contacts in one space. Input: raw rows. Output: per-row results. */
export async function upsertContacts(spaceId: string, rows: unknown[]) {
  const results: RowResult[] = rows.map((_, index) => ({ index, status: "failed" }));
  const valid: { index: number; row: ContactInput; email?: string }[] = [];
  const seen = new Set<string>();
  rows.forEach((raw, index) => {
    const parsed = contactInputSchema.safeParse(raw);
    const r = results[index]!;
    if (!parsed.success) {
      r.error = "validation_error";
      r.details = parsed.error.issues.map((i) => `${i.path.join(".") || "row"}: ${i.message}`).slice(0, 10);
      return;
    }
    const row = parsed.data;
    if (row.allowedServices?.some((s) => s !== "benefits_catalog")) { r.error = "service_not_available"; return; }
    const email = row.email?.toLowerCase();
    const keys = [row.externalId && `x:${row.externalId}`, email && `e:${email}`, row.phone && `p:${row.phone}`].filter(Boolean) as string[];
    if (keys.some((k) => seen.has(k))) { r.error = "duplicate_in_batch"; return; }
    keys.forEach((k) => seen.add(k));
    valid.push({ index, row, ...(email ? { email } : {}) });
  });

  const { columns, byKey, skipped } = await resolveColumns(spaceId, valid.map((v) => v.row.customFields ?? {}));
  const or: Prisma.SandboxContactWhereInput[] = [];
  const exts = valid.map((v) => v.row.externalId).filter((x): x is string => !!x);
  const emails = valid.map((v) => v.email).filter((x): x is string => !!x);
  const phones = valid.map((v) => v.row.phone).filter((x): x is string => !!x);
  if (exts.length) or.push({ externalId: { in: exts } });
  if (emails.length) or.push({ normalizedEmail: { in: emails } });
  if (phones.length) or.push({ phone: { in: phones } });
  const existing = or.length ? await prisma.sandboxContact.findMany({ where: { spaceId, OR: or } }) : [];
  let count = await prisma.sandboxContact.count({ where: { spaceId } });

  for (const v of valid) {
    const r = results[v.index]!;
    const custom: Record<string, string> = {};
    const skippedFields: { field: string; reason: string }[] = [];
    for (const [key, value] of Object.entries(v.row.customFields ?? {})) {
      const col = byKey.get(key);
      if (!col) { skippedFields.push({ field: key, reason: skipped.get(key) ?? "unknown_custom_field" }); continue; }
      if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") { skippedFields.push({ field: key, reason: "invalid_value" }); continue; }
      const text = String(value).trim().slice(0, 500);
      if (text) custom[col.fieldId] = text;
    }
    if (skippedFields.length) r.skippedFields = skippedFields;

    const matches = [
      v.row.externalId ? existing.find((c) => c.externalId === v.row.externalId) : undefined,
      v.email ? existing.find((c) => c.normalizedEmail === v.email) : undefined,
      v.row.phone ? existing.find((c) => c.phone === v.row.phone) : undefined,
    ].filter((c): c is SandboxContact => !!c);
    if (new Set(matches.map((c) => c.id)).size > 1) { r.error = "identifier_conflict"; continue; }

    try {
      const doc = matches[0];
      if (doc) {
        const set: Prisma.SandboxContactUpdateInput = {};
        if (empty(doc.firstName) && v.row.firstName) set.firstName = v.row.firstName;
        if (empty(doc.lastName) && v.row.lastName) set.lastName = v.row.lastName;
        if (empty(doc.normalizedEmail) && v.email && v.row.email) { set.email = v.row.email; set.normalizedEmail = v.email; }
        if (empty(doc.phone) && v.row.phone) set.phone = v.row.phone;
        if (empty(doc.address) && v.row.address) set.address = v.row.address;
        if (empty(doc.externalId) && v.row.externalId) set.externalId = v.row.externalId;
        const stored = (doc.customFields ?? {}) as Record<string, unknown>;
        const mergedCustom = { ...stored };
        for (const [id, val] of Object.entries(custom)) if (empty(stored[id])) mergedCustom[id] = val;
        if (Object.keys(mergedCustom).length !== Object.keys(stored).length) set.customFields = mergedCustom as Prisma.InputJsonObject;
        const services = [...new Set([...doc.allowedServices, ...(v.row.allowedServices ?? [])])];
        if (services.length !== doc.allowedServices.length) set.allowedServices = services;
        const updated = Object.keys(set).length ? await prisma.sandboxContact.update({ where: { id: doc.id }, data: set }) : doc;
        existing.splice(existing.indexOf(doc), 1, updated);
        Object.assign(r, { status: "merged", tenantContactId: doc.id });
      } else {
        if (count >= SANDBOX_SPACE_MAX_CONTACTS) { r.error = "sandbox_limit_reached"; continue; }
        const created = await prisma.sandboxContact.create({
          data: {
            spaceId,
            firstName: v.row.firstName ?? null,
            lastName: v.row.lastName ?? null,
            email: v.row.email ?? null,
            normalizedEmail: v.email ?? null,
            phone: v.row.phone ?? null,
            address: v.row.address ?? null,
            externalId: v.row.externalId ?? null,
            allowedServices: v.row.allowedServices ?? [],
            customFields: custom,
          },
        });
        existing.push(created);
        count += 1;
        Object.assign(r, { status: "created", tenantContactId: created.id });
      }
    } catch {
      r.error = "duplicate_identifier";
    }
  }

  const tally = (s: RowResult["status"]) => results.filter((x) => x.status === s).length;
  return { summary: { created: tally("created"), merged: tally("merged"), failed: tally("failed") }, results, joinRequestsApproved: 0, columns };
}

/** One contact of the space by id / externalId / email / phone, or null. */
export async function findContact(spaceId: string, by: { id?: string; externalId?: string; email?: string; phone?: string }) {
  const where: Prisma.SandboxContactWhereInput = { spaceId };
  if (by.id) where.id = by.id;
  else if (by.externalId) where.externalId = by.externalId;
  else if (by.email) where.normalizedEmail = by.email.toLowerCase();
  else if (by.phone) where.phone = by.phone;
  else return null;
  const contact = await prisma.sandboxContact.findFirst({ where });
  if (!contact) return null;
  return toView(contact, await prisma.sandboxColumn.findMany({ where: { spaceId } }));
}
