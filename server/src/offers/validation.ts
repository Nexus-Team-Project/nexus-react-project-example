import { Request } from "express";
import { z } from "zod";
import {
  OfferStatus,
  OfferType,
  PriceModifiers,
  VariantsType,
} from "@prisma/client";
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

const optionValueSchema = z.object({
  value: z.string().min(1, "Option value cannot be empty"),
  priceModifier: z.nativeEnum(PriceModifiers),
  priceValue: z.number("priceValue is required"),
});

const optionSchema = z.object({
  name: z.nativeEnum(VariantsType),
  values: z
    .array(optionValueSchema)
    .min(1, "Each option must have at least one value"),
});

// References an option value by (optionName, value) string — used in variant definitions.
// The service resolves these to actual DB IDs after options are created.
const optionValueRefSchema = z.object({
  optionName: z.nativeEnum(VariantsType),
  value: z.string().min(1),
});

const variantSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().optional(),
  // Omit price from the request — the service computes it from base_price + option modifiers.
  // Kept as optional in the type so the service can attach the computed value before persisting.
  price: z.number().positive().optional(),
  stock_quantity: z.number().int().min(0, "Stock quantity cannot be negative"),
  title: z.string().optional(),
  summary: z.string().optional(),
  terms: z.string().optional(),
  images: z.array(z.string().url("Invalid image URL")).optional().default([]),
  isActive: z.boolean().optional().default(true),
  // Which option values this variant represents, e.g. [{optionName:"color", value:"red"}, ...]
  optionValues: z.array(optionValueRefSchema).optional().default([]),
});

const createOfferBodySchema = z.object({
  merchantId: z.string().uuid("Invalid merchant ID"),
  title: z.string().min(1, "Title is required"),
  base_price: z.number().min(0, "Base price cannot be negative"),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  images: z.string().url("Invalid image URL").optional(),
  type: z.nativeEnum(OfferType),
  category: z.string().optional(),
  status: z.nativeEnum(OfferStatus).default("active"),
  available_quantity: z.number().int().positive().optional(),
  time_limit: z.number().int().positive().optional(),
  expiration_date: z.string().datetime({ offset: true }).optional(),
  options: z.array(optionSchema).optional().default([]),
  variants: z.array(variantSchema).min(1, "At least one variant is required"),
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
