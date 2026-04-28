/** This file validates purchase creation requests from DigiProduct. */
import { z } from "zod";

export const purchaseRequestSchema = z.object({
  tenantId: z.string().trim().min(1).max(120),
  offerId: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  amount: z.coerce.number().positive(),
  buyer_name: z.string().trim().min(1).max(120),
  buyer_email: z.string().trim().email().max(254),
  buyer_phone: z.string().trim().min(5).max(32),
  receiptDetails: z.object({
    fullName: z.string().trim().max(120).optional(),
    email: z.string().trim().email().max(254).optional(),
    phone: z.string().trim().max(32).optional(),
    notes: z.string().trim().max(500).optional(),
  }),
});

export type PurchaseRequest = z.infer<typeof purchaseRequestSchema>;
