import prisma from "../prisma";
import { AppError } from "../errors/AppError";
import logger from "../logger";
import { BulkCreateOffersInput, CreateOfferInput } from "./validation";
import { createBulkVoucherOffers, createOfferWithVariants, getOffer } from "./repository";

export async function createOffer(data: CreateOfferInput) {
  logger.info("Creating offer", {
    merchantId: data.merchantId,
    title: data.title,
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

  const { offer, variants, voucherAdmins, voucherCodes } = await createOfferWithVariants(data);

  logger.info("Offer created successfully", {
    offerId: offer.id,
    variantCount: variants.length,
    ...(voucherAdmins && { voucherAdminCount: voucherAdmins.length }),
    ...(voucherCodes && { voucherCodeCount: voucherCodes.length }),
  });

  return { offer, variants, voucherAdmins, voucherCodes };
}

export async function createBulkOffers(input: BulkCreateOffersInput) {
  const { offers } = input;

  logger.info("Bulk creating voucher offers", { count: offers.length });

  // Verify all referenced merchants exist
  const merchantIds = [...new Set(offers.map((o) => o.merchantId))];
  const merchants = await prisma.merchant.findMany({
    where: { id: { in: merchantIds } },
    select: { id: true },
  });
  const foundIds = new Set(merchants.map((m) => m.id));
  const missingId = merchantIds.find((id) => !foundIds.has(id));
  if (missingId) {
    throw new AppError(
      404,
      "MERCHANT_NOT_FOUND",
      `Merchant not found: ${missingId}`,
    );
  }

  const { batchId, results } = await createBulkVoucherOffers(offers);

  logger.info("Bulk offer creation succeeded", {
    batchId,
    offerCount: results.length,
  });

  return { batchId, results };
}

type OfferData = NonNullable<Awaited<ReturnType<typeof getOffer>>>;

export async function fetchOffer(offerId: string): Promise<OfferData> {
  const offer = await getOffer(offerId);
  if (!offer) {
    logger.warn("Offer not found", { offerId });
    throw new AppError(
      404,
      "OFFER_NOT_FOUND",
      "The requested offer does not exist",
    );
  }
  validateOffer(offer);
  return offer;
}

// Validates offer availability and type-specific rules.
// Throws AppError if the offer cannot be purchased.
export function validateOffer(offer: OfferData): void {
  if (offer.status !== "active") {
    logger.warn("Offer not active", {
      offerId: offer.id,
      status: offer.status,
    });
    throw new AppError(
      409,
      "NO_AVAILABILITY",
      "The requested offer is no longer available",
    );
  }

  // Coupon offers have a hard expiration date on the offer itself
  if (
    offer.type === "Coupon" &&
    offer.expiration_date &&
    offer.expiration_date < new Date()
  ) {
    logger.warn("Coupon offer has expired", {
      offerId: offer.id,
      expiration_date: offer.expiration_date,
    });
    throw new AppError(409, "OFFER_EXPIRED", "This offer has expired");
  }
}
