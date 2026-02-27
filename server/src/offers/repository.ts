import prisma from "../prisma";
import { CreateOfferInput } from "./validation";

export function getOfferDetails(offerId: string) {
  return prisma.merchantsOffers.findUnique({
    where: { id: offerId },
    select: {
      id: true,
      OfferVariants: {
        select: {
          id: true,
          images: true,
          title: true,
          summary: true,
          terms: true,
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

  const groups = await prisma.purchase.groupBy({
    by: ["offer_id"],
    where: {
      tenant_id: tenantId,
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

  const offerIds = groups.map((g) => g.offer_id).filter(Boolean) as string[];

  const offers = await prisma.merchantsOffers.findMany({
    where: { id: { in: offerIds } },
    select: { id: true, title: true },
  });

  const offerMap = new Map(offers.map((o) => [o.id, o.title]));

  return groups.map((g) => ({
    offerId: g.offer_id,
    title: offerMap.get(g.offer_id!) ?? "",
    numberOfUsers: g._count.id,
    totalPurchaseAmount: Number(g._sum.amount ?? 0),
  }));
}

export function getTenantUsedOffers(
  tenantId: string,
  category?: string,
  page?: number,
  pageSize?: number,
) {
  // What about trycatch here.
  return prisma.tenantsOffers.findMany({
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
      tenant_id: tenant,
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
      offerVariant: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });
}

export async function createOfferWithVariants(data: CreateOfferInput) {
  return prisma.$transaction(async (tx) => {
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
        base_price: data.base_price,
        available_quantity: data.available_quantity,
        time_limit: data.time_limit,
        expiration_date: data.expiration_date
          ? new Date(data.expiration_date)
          : undefined,
      },
    });

    // 2. Create options + their values; build a lookup "optionName:value" -> valueId
    //    so we can wire up OfferVariantValue records without extra queries.
    const valueIdMap = new Map<string, string>();

    for (const option of data.options) {
      const createdOption = await tx.variantOption.create({
        data: {
          offerId: offer.id,
          name: option.name,
          values: {
            create: option.values.map((v) => ({
              value: v.value,
              priceModifier: v.priceModifier,
              priceValue: v.priceValue,
            })),
          },
        },
        include: { values: true },
      });

      for (const createdValue of createdOption.values) {
        valueIdMap.set(`${option.name}:${createdValue.value}`, createdValue.id);
      }
    }

    // 3. Create each variant and link it to its option values
    const createdVariants = await Promise.all(
      data.variants.map((variant) => {
        const optionValueIds = variant.optionValues.map((ref) => {
          const id = valueIdMap.get(`${ref.optionName}:${ref.value}`);
          // Guard — should never happen if service pre-validation passed
          if (!id) {
            throw new Error(
              `Value ID not found for ${ref.optionName}:${ref.value}`,
            );
          }
          return id;
        });

        return tx.offerVariant.create({
          data: {
            offerId: offer.id,
            sku: variant.sku,
            barcode: variant.barcode,
            // price is guaranteed by the service's computeVariantPrice step
            price: variant.price!,
            stock_quantity: variant.stock_quantity,
            title: variant.title,
            summary: variant.summary,
            terms: variant.terms,
            images: variant.images,
            isActive: variant.isActive,
            values: {
              create: optionValueIds.map((valueId) => ({ valueId })),
            },
          },
        });
      }),
    );

    return { offer, variants: createdVariants };
  });
}

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
    },
  });
}
