import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { AppError } from "../errors/AppError";
import { AdoptVariantInput, CreateOfferInput } from "./validation";

export function getOfferDetails(offerId: string) {
  return prisma.merchantsOffers.findUnique({
    where: { id: offerId },
    select: {
      id: true,
      title: true,
      subtitle: true,
      variants: {
        select: {
          id: true,
          images: true,
          summary: true,
          terms: true,
          price: true,
          stock_quantity: true,
        },
      },
    },
  });
}

export async function getOffersStats(params: {
  tenantId: string;
  startDate?: Date;
  endDate?: Date;
  offerId?: string;
}) {
  const { tenantId, startDate, endDate, offerId } = params;

  const tenant = await prisma.tenant.findFirst({
    where: { tenant_id: tenantId },
    select: { id: true },
  });
  if (!tenant) {
    throw new AppError(404, "TENANT_NOT_FOUND", "Tenant not found");
  }

  // Each row = one unique (offer, user) pair.
  // Counting rows per offer = distinct users; summing amounts = total spent.
  const groups = await prisma.purchase.groupBy({
    by: ["offer_id", "user_id"],
    where: {
      tenant_id: tenant.id,
      ...(offerId && { offer_id: offerId }),
      ...((startDate || endDate) && {
        created_at: {
          ...(startDate && { gte: startDate }),
          ...(endDate && { lte: endDate }),
        },
      }),
    },
    _count: { id: true },
    _sum: { amount: true },
  });

  const statsMap = new Map<
    string,
    {
      numberOfUsers: number;
      numberOfPurchases: number;
      totalPurchaseAmount: number;
    }
  >();
  for (const { offer_id, _count, _sum } of groups) {
    if (!offer_id) continue;
    const entry = statsMap.get(offer_id) ?? {
      numberOfUsers: 0,
      numberOfPurchases: 0,
      totalPurchaseAmount: 0,
    };
    entry.numberOfUsers += 1;
    entry.numberOfPurchases += _count.id;
    entry.totalPurchaseAmount += Number(_sum.amount ?? 0);
    statsMap.set(offer_id, entry);
  }

  const offers = await prisma.merchantsOffers.findMany({
    where: { id: { in: [...statsMap.keys()] } },
    select: { id: true, title: true },
  });
  const titleMap = new Map(offers.map((o) => [o.id, o.title]));

  return [...statsMap.entries()].map(([id, stats]) => ({
    offerId: id,
    title: titleMap.get(id) ?? "",
    ...stats,
  }));
}

export function getTenantUsedOffers(
  tenantId: string,
  category?: string,
  page?: number,
  pageSize?: number,
) {
  return prisma.tenantOffer.findMany({
    skip: page && pageSize ? (page - 1) * pageSize : undefined,
    take: pageSize,
    where: {
      tenant: { tenant_id: tenantId },
      offer: { category },
    },
    include: {
      offer: {
        include: {
          merchant: {
            select: {
              id: true,
              business_name: true,
              business_category: true,
            },
          },
          variants: {
            select: {
              id: true,
              combination: true,
              price: true,
              stock_quantity: true,
            },
          },
        },
      },
    },
  });
}

export async function getUserPurchasedOffersStatus(
  tenant: string,
  userEmail: string,
) {
  return prisma.purchase.findMany({
    where: {
      tenant: { tenant_id: tenant },
      user: { email: userEmail },
    },
    select: {
      id: true,
      offer_id: true,
      offer_variant_id: true,
      amount: true,
      created_at: true,
      expiration_date: true,
      offer: {
        select: {
          title: true,
          type: true,
          expiration_date: true,
        },
      },
      offer_variant: {
        select: {
          id: true,
          combination: true,
        },
      },
    },
  });
}

// Builds the Cartesian product of option value arrays.
// Returns [{}] for an empty options list (one no-option variant).
function buildCombinations(
  options: Array<{ option_name: string; values: (string | number)[] }>,
): Record<string, string | number>[] {
  if (options.length === 0) return [{}];
  const [first, ...rest] = options;
  const restCombinations = buildCombinations(rest);
  return first.values.flatMap((value) =>
    restCombinations.map((combo) => ({ [first.option_name]: value, ...combo })),
  );
}

// Returns true when two combination objects are identical (key-count + every key-value pair).
function combinationsMatch(
  a: Record<string, string | number>,
  b: Record<string, string | number>,
): boolean {
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  return (
    aKeys.length === bKeys.length &&
    aKeys.every((k, i) => k === bKeys[i] && a[k] === b[k])
  );
}

// Core transactional logic for a single offer — runs inside a caller-supplied tx.
// batchId must be provided externally so bulk operations can share the same UUID.
async function createSingleOfferInTx(
  tx: Prisma.TransactionClient,
  data: CreateOfferInput,
  batchId: string,
) {
  // 1. Create the parent offer
  const offer = await tx.merchantsOffers.create({
    data: {
      merchant_id: data.merchantId,
      title: data.title,
      subtitle: data.subtitle,
      description: data.description,
      images: data.images,
      type: data.type,
      category: data.category,
      status: data.status,
      time_limit: data.time_limit,
      expiration_date: data.expiration_date
        ? new Date(data.expiration_date)
        : undefined,
    },
  });

  // 2. Create OfferOption rows
  if (data.options.length > 0) {
    await tx.offerOption.createMany({
      data: data.options.map((o) => ({
        offer_id: offer.id,
        option_name: o.option_name,
        option_type: o.option_type ?? "text",
        values: o.values,
      })),
    });
  }

  // 3. Compute Cartesian product → one variant per combination
  const combinations = buildCombinations(data.options);

  // 4. Create one OfferVariant per combination, applying any matching variantData
  //    supplied by the merchant. Unmatched combinations default to 0.
  const variants = await Promise.all(
    combinations.map((combination, i) => {
      const override = data.variantData.find((vd) =>
        combinationsMatch(vd.combination, combination),
      );
      return tx.offerVariant.create({
        data: {
          offer_id: offer.id,
          sku: `${offer.id}-${i + 1}`,
          combination,
          price: override?.price ?? 0,
          value: override?.value ?? 0,
          cost: override?.cost ?? 0,
          stock_quantity: override?.stock_quantity ?? 0,
          isActive: false,
        },
      });
    }),
  );

  // 5. For Voucher offers: create one VoucherAdmin per variant using the
  //    voucherData that matches that variant's combination.
  //    Optionally seed VoucherCode rows when codes are provided.
  let voucherAdmins:
    | Awaited<ReturnType<typeof tx.voucherAdmin.create>>[]
    | undefined;
  let voucherCodes:
    | Awaited<ReturnType<typeof tx.voucherCode.create>>[]
    | undefined;

  if (data.type === "Voucher") {
    const adminRows: Awaited<ReturnType<typeof tx.voucherAdmin.create>>[] = [];
    const codeRows: Awaited<ReturnType<typeof tx.voucherCode.create>>[] = [];

    for (const variant of variants) {
      // Find the variantData whose combination matches this variant
      const override = data.variantData.find((vd) =>
        combinationsMatch(
          vd.combination,
          variant.combination as unknown as Record<string, string | number>,
        ),
      );
      if (!override?.voucherData) continue; // no voucherData supplied for this variant → skip

      const admin = await tx.voucherAdmin.create({
        data: {
          variant_id: variant.id,
          batch_id: batchId,
          purchase_value: override.voucherData.purchase_value,
          cost_price: override.voucherData.cost_price,
        },
      });
      adminRows.push(admin);

      const codes = override.voucherData.codes ?? [];
      for (const code of codes) {
        codeRows.push(
          await tx.voucherCode.create({
            data: {
              variant_id: variant.id,
              sku: variant.sku,
              batch_id: batchId,
              barcode: code,
              status: "available",
            },
          }),
        );
      }
    }

    if (adminRows.length > 0) voucherAdmins = adminRows;
    if (codeRows.length > 0) voucherCodes = codeRows;
  }

  return { offer, variants, voucherAdmins, voucherCodes };
}

// Single-offer creation — generates its own batchId.
export async function createOfferWithVariants(data: CreateOfferInput) {
  const batchId = randomUUID();
  return prisma.$transaction((tx) => createSingleOfferInTx(tx, data, batchId));
}

// Bulk Voucher offer creation — all VoucherAdmin records share one batchId,
// and the entire operation is wrapped in a single transaction.
export async function createBulkVoucherOffers(offers: CreateOfferInput[]) {
  const batchId = randomUUID();
  return prisma.$transaction(async (tx) => {
    const results = [];
    for (const data of offers) {
      results.push(await createSingleOfferInTx(tx, data, batchId));
    }
    return { batchId, results };
  });
}

export const getOffer = async (offerId: string) => {
  return await prisma.merchantsOffers.findUnique({
    where: { id: offerId },
    select: {
      id: true,
      status: true,
      title: true,
      type: true,
      time_limit: true,
      expiration_date: true,
      merchant: {
        select: {
          payme_seller_id: true,
          payme_api_key: true,
          commission_rate: true,
        },
      },
    },
  });
};

export function getTenantAvailableOffers(
  tenantId: string,
  category?: string,
  page?: number,
  pageSize?: number,
) {
  return prisma.merchantsOffers.findMany({
    skip: page && pageSize ? (page - 1) * pageSize : undefined,
    take: pageSize,
    where: {
      category,
      OR: [{ expiration_date: null }, { expiration_date: { gt: new Date() } }],
      excludedTenants: { none: { tenant: { tenant_id: tenantId } } },
    },

    select: {
      id: true,
      images: true,
      title: true,
      subtitle: true,
      description: true,
      category: true,
      variants: {
        select: {
          id: true,
          price: true,
          combination: true,
        },
      },
    },
  });
}

export async function adoptOfferVariant(data: AdoptVariantInput) {
  const tenant = await prisma.tenant.findFirst({
    where: { tenant_id: data.tenantId },
    select: { id: true },
  });
  if (!tenant) {
    throw new AppError(404, "TENANT_NOT_FOUND", "Tenant not found");
  }

  const variant = await prisma.offerVariant.findUnique({
    where: { id: data.variantId },
    select: { id: true, offer_id: true, value: true, price: true },
  });

  if (!variant) {
    throw new AppError(404, "VARIANT_NOT_FOUND", "Offer variant not found");
  }

  // tenant_price = (variant_value - variant_price) * (1 + tenant_delta)
  const tenantPriceGap =
    (Number(variant.value) - Number(variant.price)) * (data.tenantDelta / 100);
  const tenantPrice = Number(variant.price) + tenantPriceGap;

  return prisma.tenantOffer.upsert({
    where: {
      tenant_id_variant_id: {
        tenant_id: tenant.id,
        variant_id: variant.id,
      },
    },
    update: {
      tenant_delta: data.tenantDelta,
      tenant_price: tenantPrice,
      is_active: true,
    },
    create: {
      tenant_id: tenant.id,
      offer_id: variant.offer_id,
      variant_id: variant.id,
      tenant_delta: data.tenantDelta,
      tenant_price: tenantPrice,
    },
  });
}

export const getOfferVariant = async (offerVariantId: string) => {
  return await prisma.offerVariant.findUnique({
    where: { id: offerVariantId },
    select: {
      id: true,
      combination: true,
      price: true,
      value: true,
      offer_id: true,
      sku: true,
      stock_quantity: true,
      offer: {
        select: {
          id: true,
          status: true,
          title: true,
          type: true,
          time_limit: true,
          expiration_date: true,
          merchant: {
            select: {
              payme_seller_id: true,
              payme_api_key: true,
              commission_rate: true,
            },
          },
        },
      },
    },
  });
};
