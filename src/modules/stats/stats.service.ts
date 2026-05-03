/** This file builds aggregated paid-purchase statistics for tenant offers. */
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../shared/errors.js";
import { decimalToNumber } from "../../shared/money.js";

/** Returns distinct user counts and total paid amount by offer. */
export async function getOfferStats(input: {
  tenantPublicId: string;
  startDate?: string;
  endDate?: string;
  offerId?: string;
}) {
  const tenant = await prisma.tenant.findFirst({
    where: { tenantId: input.tenantPublicId, status: "ACTIVE" },
  });

  if (!tenant) {
    throw new AppError("NOT_FOUND", "Tenant was not found");
  }

  const start = input.startDate ? new Date(input.startDate) : undefined;
  const end = input.endDate ? new Date(input.endDate) : undefined;
  if (start && end && start > end) {
    throw new AppError("BAD_REQUEST", "startDate must be before endDate");
  }

  const purchases = await prisma.purchase.findMany({
    where: {
      tenantId: tenant.id,
      status: "PAID",
      ...(input.offerId ? { offer: { publicId: input.offerId } } : {}),
      ...(start || end ? { paidAt: { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) } } : {}),
    },
    include: { offer: true },
  });

  const grouped = new Map<string, { title: string; userEmails: Set<string>; total: number }>();
  for (const purchase of purchases) {
    const current = grouped.get(purchase.offer.publicId) ?? {
      title: purchase.offer.title,
      userEmails: new Set<string>(),
      total: 0,
    };
    current.userEmails.add(purchase.userEmail);
    current.total += decimalToNumber(purchase.amount);
    grouped.set(purchase.offer.publicId, current);
  }

  return {
    stats: [...grouped.entries()].map(([offerId, value]) => ({
      offerId,
      title: value.title,
      numberOfUsers: value.userEmails.size,
      userEmails: [...value.userEmails].sort((left, right) => left.localeCompare(right)),
      totalPurchaseAmount: value.total,
    })),
  };
}
