/** This file maps offer database records into Nexus-compatible API responses. */
import { AppError } from "../../shared/errors.js";
import { decimalToNumber } from "../../shared/money.js";
import { findActiveOfferByPublicId, findActiveTenantByPublicId, getOfferDetails, listActiveOffers } from "./offers.repository.js";

type ListedOffer = Awaited<ReturnType<typeof listActiveOffers>>[number];

/** Resolves /offers/:id as either a tenant offer list or a single offer detail. */
export async function resolveOfferRoute(input: {
  id: string;
  page: number;
  pageSize: number;
  category?: string;
  assertTenantAccess: (tenantId: string) => void;
}) {
  const tenant = await findActiveTenantByPublicId(input.id);
  if (tenant) {
    input.assertTenantAccess(tenant.tenantId);
    const offers = await listActiveOffers({
      tenantDbId: tenant.id,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      ...(input.category ? { category: input.category } : {}),
    });

    return {
      offers: offers.map((offer) => ({
        offerId: offer.publicId,
        image: offer.imageUrl,
        title: offer.title,
        summary: offer.summary,
        price: getVisiblePrice(offer),
      })),
    };
  }

  const offer = await findActiveOfferByPublicId(input.id);
  if (!offer) {
    throw new AppError("NOT_FOUND", "Tenant or offer was not found");
  }

  input.assertTenantAccess(offer.tenant.tenantId);
  return getOfferDetailResponse(offer.publicId);
}

/** Builds the detailed offer response with active sub-offers and cost options. */
export async function getOfferDetailResponse(offerId: string) {
  const offer = await getOfferDetails(offerId);
  if (!offer) {
    throw new AppError("NOT_FOUND", "Offer was not found");
  }

  return {
    offerId: offer.publicId,
    subOffers: offer.subOffers.map((subOffer) => ({
      subOfferId: subOffer.publicId,
      images: parseStringArray(subOffer.imageUrls),
      title: subOffer.title,
      summary: subOffer.summary,
      terms: subOffer.terms,
      costOptions: subOffer.costOptions.map((option) => ({
        type: option.type.toLowerCase(),
        ...(option.type === "FIXED" && option.cost ? { cost: decimalToNumber(option.cost) } : {}),
        ...(option.type === "CUSTOM" && option.minAmount && option.maxAmount
          ? { minAmount: decimalToNumber(option.minAmount), maxAmount: decimalToNumber(option.maxAmount) }
          : {}),
        available: Math.max(option.available - option.reserved - option.sold, 0),
      })),
    })),
  };
}

/** Returns the fixed price or minimum custom amount used by offer list cards. */
function getVisiblePrice(offer: ListedOffer): number {
  const costs = offer.subOffers.flatMap((subOffer) => subOffer.costOptions);
  const fixedCosts = costs.filter((option) => option.type === "FIXED" && option.cost).map((option) => option.cost!);
  const customMinimums = costs.filter((option) => option.type === "CUSTOM" && option.minAmount).map((option) => option.minAmount!);
  const candidates = [...fixedCosts, ...customMinimums].sort((left, right) => left.comparedTo(right));
  return candidates[0] ? decimalToNumber(candidates[0]) : 0;
}

/** Safely parses JSON image arrays from Prisma into string arrays. */
function parseStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
