import prisma from "../prisma";
import { PriceModifiers } from "@prisma/client";
import { AppError } from "../errors/AppError";
import logger from "../logger";
import { CreateOfferInput } from "./validation";
import { createOfferWithVariants } from "./repository";

type PriceEntry = { priceModifier: PriceModifiers; priceValue: number };

// Applies each option value's modifier to the base price in declaration order.
// addition  → price += priceValue
// multiplication → price *= priceValue
function computeVariantPrice(
  basePrice: number,
  optionValues: Array<{ optionName: string; value: string }>,
  priceMap: Map<string, Map<string, PriceEntry>>,
): number {
  let price = basePrice;

  for (const ref of optionValues) {
    const entry = priceMap.get(ref.optionName)?.get(ref.value);
    if (!entry) continue;

    if (entry.priceModifier === "addition") {
      price += entry.priceValue;
    } else if (entry.priceModifier === "multiplication") {
      price *= entry.priceValue;
    }
  }

  // Round to 2 decimal places to avoid floating-point drift
  return Math.round(price * 100) / 100;
}

export async function createOffer(data: CreateOfferInput) {
  // TODO: Check with raz if its a voucher and voucher means coupon, if yes meir already have the codes
  // and we need to store the coupons on different table.

  logger.info("Creating offer", {
    merchantId: data.merchantId,
    title: data.title,
    basePrice: data.base_price,
    variantCount: data.variants.length,
    optionCount: data.options.length,
  });

  // Verify the merchant exists before writing anything
  const merchant = await prisma.merchant.findUnique({
    where: { id: data.merchantId },
    select: { id: true },
  });
  if (!merchant) {
    throw new AppError(404, "MERCHANT_NOT_FOUND", "Merchant not found");
  }

  // Validate that every option-value reference in variants resolves to a
  // declared option and value. Catching this before the DB transaction gives
  // a clear error message instead of a confusing internal failure.
  const optionMap = new Map(
    data.options.map((o) => [o.name, new Set(o.values.map((v) => v.value))]),
  );

  for (const variant of data.variants) {
    for (const ref of variant.optionValues) {
      const validValues = optionMap.get(ref.optionName);
      if (!validValues) {
        throw new AppError(
          400,
          "INVALID_OPTION_REFERENCE",
          `Option "${ref.optionName}" referenced in variant "${variant.sku}" is not declared in options`,
        );
      }
      if (!validValues.has(ref.value)) {
        throw new AppError(
          400,
          "INVALID_OPTION_VALUE_REFERENCE",
          `Value "${ref.value}" for option "${ref.optionName}" referenced in variant "${variant.sku}" is not declared`,
        );
      }
    }
  }

  // Build a nested lookup: optionName → value → { priceModifier, priceValue }
  // Used by computeVariantPrice to apply each option's modifier in order.
  const priceMap = new Map<string, Map<string, PriceEntry>>();
  for (const option of data.options) {
    const valueMap = new Map<string, PriceEntry>();
    for (const v of option.values) {
      valueMap.set(v.value, {
        priceModifier: v.priceModifier,
        priceValue: v.priceValue,
      });
    }
    priceMap.set(option.name, valueMap);
  }

  // Compute the final price for every variant and attach it before persisting
  const variantsWithPrice = data.variants.map((variant) => ({
    ...variant,
    price: computeVariantPrice(data.base_price, variant.optionValues, priceMap),
  }));

  logger.info("Computed variant prices", {
    basePrice: data.base_price,
    variants: variantsWithPrice.map((v) => ({ sku: v.sku, price: v.price })),
  });

  const { offer, variants } = await createOfferWithVariants({
    ...data,
    variants: variantsWithPrice,
  });

  logger.info("Offer created successfully", {
    offerId: offer.id,
    variantCount: variants.length,
  });

  return { offer, variants };
}
