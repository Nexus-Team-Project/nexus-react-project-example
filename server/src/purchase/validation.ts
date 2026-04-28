import { Request } from "express";
import { z } from "zod";
import { AppError } from "../errors/AppError";

const bodyParamsSchema = z
  .object({
    tenantId: z.string(),
    offerId: z.string().min(1).optional(),
    offerVariantId: z.string().min(1),
    email: z.email("Invalid email format"),
    // amount is intentionally NOT accepted from the client.
    // The server computes it from the variant and tenant delta.
    buyer_name: z.string().min(1, "Buyer name is required"),
    buyer_email: z.email("Invalid buyer email format"),
    buyer_phone: z.string().optional(),
    receiptDetails: z.object({
      fullName: z.string().min(1, "Full Name is required"),
      email: z.email("Invalid email format"),
      phone: z.string().optional(),
      taxId: z.string().optional(),
      noted: z.string().optional(),
    }),
  })
  .refine((data) => data.offerId || data.offerVariantId, {
    message: "Either offerId or offerVariantId must be provided",
  });

export type PurchaseRequestData = z.infer<typeof bodyParamsSchema>;

export function validatePurchaseRequest(req: Request): PurchaseRequestData {
  const result = bodyParamsSchema.safeParse(req.body);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new AppError(400, "INVALID_PARAMETERS", firstIssue.message);
  }

  return result.data;
}
