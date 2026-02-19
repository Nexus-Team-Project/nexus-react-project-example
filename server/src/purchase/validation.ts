import { Request } from "express";
import { z } from "zod";

const bodyParamsSchema = z.object({
  tenantId: z.string().optional(),
  offerId: z.uuid("Invalid offer ID format"),
  email: z.email("Invalid email format"),
  amount: z.coerce.number().positive("The provided amount is invalid"),
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
});

export function validatePurchaseRequest(req: Request) {
  const paramsResult = bodyParamsSchema.safeParse(req.body);
  if (!paramsResult.success) {
    return {
      data: null,
      error: {
        status: 400,
        message: "Invalid parameters",
        errorCode: "INVALID_PARAMETERS", //TODO: Customize the error code by each validation error type.
        details: paramsResult.error.issues[0].message,
      },
    };
  }

  const data = paramsResult.data;

  return {
    error: null,
    data,
  };
}
