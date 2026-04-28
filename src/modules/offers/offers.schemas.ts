/** This file defines validated inputs and public response types for offer routes. */
import { z } from "zod";

export const offerLookupParamsSchema = z.object({
  id: z.string().min(1).max(120),
});

export const offerListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  category: z.string().trim().min(1).max(80).optional(),
});

export type OfferLookupParams = z.infer<typeof offerLookupParamsSchema>;
export type OfferListQuery = z.infer<typeof offerListQuerySchema>;
