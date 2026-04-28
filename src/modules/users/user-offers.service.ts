/** This file returns purchased offers for one user under one tenant. */
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../shared/errors.js";
import { decimalToNumber } from "../../shared/money.js";
import { normalizeEmail } from "../../shared/strings.js";

/** Lists successful purchases that have issued benefits for a user. */
export async function getPurchasedOffersForUser(tenantPublicId: string, userEmail: string) {
  const userEmailNormalized = normalizeEmail(userEmail);
  const tenant = await prisma.tenant.findFirst({
    where: { tenantId: tenantPublicId, status: "ACTIVE" },
  });

  if (!tenant) {
    throw new AppError("NOT_FOUND", "Tenant was not found");
  }

  const user = await prisma.user.findUnique({
    where: { tenantId_emailNormalized: { tenantId: tenant.id, emailNormalized: userEmailNormalized } },
  });

  if (!user) {
    throw new AppError("NOT_FOUND", "User was not found");
  }

  const purchases = await prisma.purchase.findMany({
    where: {
      tenantId: tenant.id,
      userEmailNormalized,
      status: "PAID",
      issuedBenefit: { isNot: null },
    },
    include: {
      offer: true,
      issuedBenefit: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    purchasedOffers: purchases.map((purchase) => ({
      offerId: purchase.offer.publicId,
      title: purchase.offer.title,
      purchaseDate: purchase.createdAt.toISOString(),
      expiryDate: purchase.issuedBenefit?.expiresAt.toISOString() ?? purchase.createdAt.toISOString(),
      status: mapBenefitStatus(purchase.issuedBenefit?.status, purchase.issuedBenefit?.expiresAt),
      amount: decimalToNumber(purchase.amount),
    })),
  };
}

/** Maps internal benefit state into the Nexus-style active, expired, or used status. */
function mapBenefitStatus(status: string | undefined, expiresAt: Date | undefined): "active" | "expired" | "used" {
  if (status === "USED") {
    return "used";
  }

  if (status === "EXPIRED" || (expiresAt && expiresAt < new Date())) {
    return "expired";
  }

  return "active";
}
