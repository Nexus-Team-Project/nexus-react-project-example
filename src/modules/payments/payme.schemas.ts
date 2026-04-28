/** This file validates PayMe-like webhook payloads before they change state. */
import { z } from "zod";

export const paymeWebhookSchema = z.object({
  eventId: z.string().min(1).optional(),
  purchaseId: z.string().min(1),
  providerSessionId: z.string().min(1).optional(),
  providerSaleId: z.string().min(1).optional(),
  amount: z.union([z.string(), z.number()]).transform((value) => String(value)),
  currency: z.string().min(3).max(3),
  status: z.enum(["paid", "failed", "cancelled", "expired", "refunded"]),
});

export const paymeGenerateSaleResponseSchema = z.object({
  status_code: z.number(),
  sale_url: z.string().url(),
  payme_sale_id: z.string().min(1),
  payme_sale_code: z.union([z.string(), z.number()]).optional(),
  price: z.union([z.string(), z.number()]),
  transaction_id: z.string().min(1),
  currency: z.string().min(3).max(3),
  sale_payment_method: z.string().min(1),
  session: z.string().min(1).optional(),
});
