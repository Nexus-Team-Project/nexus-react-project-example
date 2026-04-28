/** This file contains database writes and reads for purchase creation. */
import type { PrismaClient } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

/** Finds the active tenant, user, offer, sub-offer, and cost options for a purchase. */
export async function getPurchaseContext(input: {
  tenantId: string;
  offerId: string;
  emailNormalized: string;
}) {
  return prisma.tenant.findFirst({
    where: { tenantId: input.tenantId, status: "ACTIVE" },
    include: {
      users: {
        where: { emailNormalized: input.emailNormalized, status: "ACTIVE" },
        take: 1,
      },
      offers: {
        where: { publicId: input.offerId, status: "ACTIVE" },
        include: {
          subOffers: {
            where: { status: "ACTIVE" },
            include: {
              costOptions: { where: { status: "ACTIVE" } },
            },
          },
        },
        take: 1,
      },
    },
  });
}

/** Updates a purchase with its provider payment session after PayMe is called. */
export async function createPaymentSessionRecord(input: {
  purchaseId: string;
  providerEnvironment: "SANDBOX" | "PRODUCTION";
  providerSessionId?: string;
  providerSaleId?: string;
  checkoutUrl: string;
  requestPayload: unknown;
  responsePayload: unknown;
}) {
  return prisma.paymentSession.create({
    data: {
      purchaseId: input.purchaseId,
      providerEnvironment: input.providerEnvironment,
      providerSessionId: input.providerSessionId ?? null,
      providerSaleId: input.providerSaleId ?? null,
      checkoutUrl: input.checkoutUrl,
      requestPayload: input.requestPayload as object,
      responsePayload: input.responsePayload as object,
    },
  });
}

/** Returns the Prisma client so services can keep purchase writes transactional. */
export function getPurchasePrisma(): PrismaClient {
  return prisma;
}
