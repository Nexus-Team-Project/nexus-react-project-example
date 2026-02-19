import { Request } from "express";
import { z } from "zod";

// Validation schemas
const paramsSchema = z.object({
  tenantId: z.string().min(1, "Tenant ID is required"),
});

const querySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  category: z.string().optional(),
});

export function validateOfferRequest(req: Request) {
  const paramsResult = paramsSchema.safeParse(req.params);
  if (!paramsResult.success) {
    return {
      data: null,
      error: {
        status: 400,
        message: "Invalid parameters",
        details: paramsResult.error.issues[0].message,
      },
    };
  }

  const queryResult = querySchema.safeParse(req.query);
  if (!queryResult.success) {
    return {
      data: null,
      error: {
        status: 400,
        message: "Invalid parameters",
        details: queryResult.error.issues[0].message,
      },
    };
  }

  const { tenantId } = paramsResult.data;
  const { page, pageSize, category } = queryResult.data;

  return {
    error: null,
    data: {
      tenantId,
      page,
      pageSize,
      category,
    },
  };
}
