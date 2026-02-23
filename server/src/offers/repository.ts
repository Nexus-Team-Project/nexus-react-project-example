import prisma from "../prisma";

export function getOfferDetails(offerId: string) {
  return prisma.merchantsOffers.findUnique({
    where: { id: offerId },
    select: {
      id: true,
      subOffers: {
        select: {
          id: true,
          images: true,
          title: true,
          summary: true,
          terms: true,
          costOptions: {
            select: {
              type: true,
              cost: true,
              available: true,
            },
          },
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
