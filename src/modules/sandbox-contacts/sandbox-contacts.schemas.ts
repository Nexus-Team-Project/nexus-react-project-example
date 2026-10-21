/** This file defines the request schemas of the Contacts API sandbox (mirrors the real Nexus API). */
import { z } from "zod";

/** Rows per bulk call in the sandbox (the real API accepts 10,000). */
export const SANDBOX_BULK_MAX = 1000;
/** Contacts one sandbox space may hold. */
export const SANDBOX_SPACE_MAX_CONTACTS = 1000;
/** Custom columns one sandbox space may hold (same as the real API). */
export const SANDBOX_MAX_COLUMNS = 25;

/** Normalizes an Israeli mobile to 05XXXXXXXX, or null when it is not one. */
export function normalizeIsraeliPhone(raw: string): string | null {
  const digits = raw.replace(/[\s\-().]/g, "");
  const local = digits.startsWith("+972") ? `0${digits.slice(4)}` : digits.startsWith("972") ? `0${digits.slice(3)}` : digits;
  return /^05\d{8}$/.test(local) ? local : null;
}

const phoneInput = z
  .string()
  .trim()
  .max(32)
  .optional()
  .transform((value, ctx) => {
    if (value === undefined || value === "") return undefined;
    const normalized = normalizeIsraeliPhone(value);
    if (!normalized) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid Israeli phone number. Use 05XXXXXXXX or +972XXXXXXXX." });
      return z.NEVER;
    }
    return normalized;
  });

/** One contact as sent to create / bulk create. */
export const contactInputSchema = z
  .object({
    firstName: z.string().trim().max(100).optional(),
    lastName: z.string().trim().max(100).optional(),
    email: z.string().trim().email().max(255).optional(),
    phone: phoneInput,
    address: z.string().trim().max(500).optional(),
    externalId: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9._:-]+$/).optional(),
    allowedServices: z.array(z.enum(["benefits_catalog", "provider_service", "digital_wallet", "business_payments"])).max(4).optional(),
    customFields: z
      .record(z.unknown())
      .refine((value) => Object.keys(value).length <= 50, { message: "Too many custom fields (max 50)" })
      .optional(),
  })
  .strict()
  .refine((value) => value.email !== undefined || value.phone !== undefined, {
    message: "A contact needs a valid email or a valid Israeli phone",
    path: ["email"],
  });

export type ContactInput = z.infer<typeof contactInputSchema>;

export const bulkBodySchema = z.object({ contacts: z.array(z.unknown()).min(1).max(SANDBOX_BULK_MAX) });

const deleteItemSchema = z.union([
  z.object({ tenantContactId: z.string().trim().min(1).max(200) }).strict(),
  z.object({ externalId: z.string().trim().min(1).max(100) }).strict(),
]);
export type DeleteItem = z.infer<typeof deleteItemSchema>;

export const bulkDeleteBodySchema = z.object({ items: z.array(deleteItemSchema).min(1).max(SANDBOX_BULK_MAX) });

export const deleteAllBodySchema = z.object({
  confirm: z.literal("DELETE_ALL_CONTACTS"),
  dryRun: z.boolean().optional().default(false),
});

export const contactsQuerySchema = z.object({
  externalId: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email().max(255).optional(),
  phone: phoneInput,
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const contactIdParamsSchema = z.object({ tenantContactId: z.string().trim().min(1).max(200) });
export const deleteQuerySchema = z.object({ externalId: z.string().trim().min(1).max(100) });
