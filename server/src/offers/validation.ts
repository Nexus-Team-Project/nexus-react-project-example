import { Request } from "express";
import { z } from "zod";
import { OfferStatus, OfferType } from "@prisma/client";
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
    throw new AppError(
      400,
      "INVALID_PARAMETERS",
      paramsResult.error.issues[0].message,
    );
  }

  const queryResult = statsQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    throw new AppError(
      400,
      "INVALID_PARAMETERS",
      queryResult.error.issues[0].message,
    );
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

const userOffersStatusParamsSchema = z.object({
  tenant: z.string().min(1, "Tenant is required"),
  userEmail: z.string().email("Invalid email address"),
});

export function validateUserOffersStatusRequest(req: Request) {
  const result = userOffersStatusParamsSchema.safeParse(req.params);
  if (!result.success) {
    throw new AppError(
      400,
      "INVALID_PARAMETERS",
      result.error.issues[0].message,
    );
  }
  return result.data;
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

// ── Create Offer ─────────────────────────────────────────────────────────────

// One option axis submitted by the merchant, e.g. { option_name: "Color", values: ["Red","Blue"] }
const optionSchema = z.object({
  option_name: z.string().min(1, "Option name is required"),
  option_type: z.string().optional().default("text"),
  values: z
    .array(
      z.union([z.string().min(1, "Option value cannot be empty"), z.number()]),
    )
    .min(1, "Each option must have at least one value"),
});

const createOfferBodySchema = z.object({
  merchantId: z.string().uuid("Invalid merchant ID"),
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  images: z.string().url("Invalid image URL").optional(),
  type: z.nativeEnum(OfferType),
  category: z.string().optional(),
  status: z.nativeEnum(OfferStatus).default("active"),
  time_limit: z.number().int().positive().optional(),
  expiration_date: z.string().datetime({ offset: true }).optional(),
  // Variants are auto-generated from the Cartesian product of options.
  // The merchant fills price and stock in a second UI step.
  options: z.array(optionSchema).optional().default([]),
});

export type CreateOfferInput = z.infer<typeof createOfferBodySchema>;

export function validateCreateOfferRequest(req: Request): CreateOfferInput {
  const result = createOfferBodySchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError(
      400,
      "INVALID_PARAMETERS",
      result.error.issues[0].message,
    );
  }
  return result.data;
}

// ── Adopt Variant ─────────────────────────────────────────────────────────────

const adoptVariantBodySchema = z.object({
  tenantId: z.string().min(1, "Tenant ID is required"),
  variantId: z.string().uuid("Invalid variant ID"),
  tenantDelta: z.number().default(0),
});

export type AdoptVariantInput = z.infer<typeof adoptVariantBodySchema>;

export function validateAdoptVariantRequest(req: Request): AdoptVariantInput {
  const result = adoptVariantBodySchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError(
      400,
      "INVALID_PARAMETERS",
      result.error.issues[0].message,
    );
  }
  return result.data;
}
