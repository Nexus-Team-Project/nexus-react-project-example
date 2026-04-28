/** This file contains database queries for Nexus-compatible offer endpoints. */
import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

/** Finds one active tenant by its public tenant ID. */
export async function findActiveTenantByPublicId(tenantId: string) {
  return prisma.tenant.findFirst({
    where: { tenantId, status: "ACTIVE" },
  });
}

/** Finds one active offer by its public offer ID with tenant details. */
export async function findActiveOfferByPublicId(publicId: string) {
  return prisma.offer.findFirst({
    where: { publicId, status: "ACTIVE" },
    include: { tenant: true },
  });
}

/** Lists active offers for a tenant with the minimum visible cost option. */
export async function listActiveOffers(input: {
  tenantDbId: string;
  category?: string;
  skip: number;
  take: number;
}) {
  const where: Prisma.OfferWhereInput = {
    tenantId: input.tenantDbId,
    status: "ACTIVE",
    ...(input.category ? { category: input.category } : {}),
  };

  return prisma.offer.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    skip: input.skip,
    take: input.take,
    include: {
      subOffers: {
        where: { status: "ACTIVE" },
        include: {
          costOptions: {
            where: { status: "ACTIVE" },
            orderBy: [{ cost: "asc" }, { minAmount: "asc" }],
          },
        },
      },
    },
  });
}

/** Loads active sub-offers and cost options for one offer detail response. */
export async function getOfferDetails(publicId: string) {
  return prisma.offer.findFirst({
    where: { publicId, status: "ACTIVE" },
    include: {
      tenant: true,
      subOffers: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        include: {
          costOptions: {
            where: { status: "ACTIVE" },
            orderBy: [{ cost: "asc" }, { minAmount: "asc" }],
          },
        },
      },
    },
  });
}
