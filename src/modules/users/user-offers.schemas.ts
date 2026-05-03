/** This file validates user purchased-offer status and barcode route parameters. */
import { z } from "zod";

/** Validates the tenant and user email used to list a user's purchased offers. */
export const userStatusParamsSchema = z.object({
  tenant: z.string().min(1).max(120),
  userEmail: z.string().email().max(254),
});

/** Validates the tenant, user email, and purchase ID used to show one barcode again. */
export const userBarcodeParamsSchema = userStatusParamsSchema.extend({
  purchaseId: z.string().trim().min(1).max(160),
});
