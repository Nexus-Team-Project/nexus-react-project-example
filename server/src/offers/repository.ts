import prisma from "../prisma";

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
