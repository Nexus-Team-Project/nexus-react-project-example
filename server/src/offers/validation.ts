import { Request } from "express";
import { z } from "zod";
import { AppError } from "../errors/AppError";

// Validation schemas
const paramsSchema = z.object({
  tenantId: z.string().min(1, "Tenant ID is required"),
});

const querySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  category: z.string().optional(),
});

const statsParamsSchema = z.object({
  tenantId: z.string().min(1, "Tenant ID is required"),
});

const statsQuerySchema = z.object({
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).optional(),
  offerId: z.string().uuid("Invalid offer ID format").optional(),
});

export function validateStatsRequest(req: Request) {
  const paramsResult = statsParamsSchema.safeParse(req.params);
  if (!paramsResult.success) {
    throw new AppError(400, "INVALID_PARAMETERS", paramsResult.error.issues[0].message);
  }

  const queryResult = statsQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    throw new AppError(400, "INVALID_PARAMETERS", queryResult.error.issues[0].message);
  }

  const { tenantId } = paramsResult.data;
  const { startDate, endDate, offerId } = queryResult.data;

  return {
    tenantId,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    offerId,
  };
}

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
