/** This file returns purchased offers and demo barcodes for one user under one tenant. */
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../shared/errors.js";
import { decimalToNumber } from "../../shared/money.js";
import { normalizeEmail } from "../../shared/strings.js";

interface DemoBarcode {
  value: string;
  format: "CODE_128";
  isMock: true;
}

interface PurchasedOfferBarcodeResponse {
  purchaseId: string;
  offerId: string;
  title: string;
  barcode: DemoBarcode;
}

/** Lists successful purchases that have issued benefits for a user. */
export async function getPurchasedOffersForUser(tenantPublicId: string, userEmail: string) {
  const { tenant, userEmailNormalized } = await getActiveUserTenantContext(tenantPublicId, userEmail);

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
      purchaseId: purchase.publicId,
      offerId: purchase.offer.publicId,
      title: purchase.offer.title,
      purchaseDate: purchase.createdAt.toISOString(),
      expiryDate: purchase.issuedBenefit?.expiresAt.toISOString() ?? purchase.createdAt.toISOString(),
      status: mapBenefitStatus(purchase.issuedBenefit?.status, purchase.issuedBenefit?.expiresAt),
      amount: decimalToNumber(purchase.amount),
      barcode: createDemoBarcode(purchase.publicId),
    })),
  };
}

/** Returns the demo barcode for one paid purchase so the user can view it again. */
export async function getPurchasedOfferBarcode(
  tenantPublicId: string,
  userEmail: string,
  purchasePublicId: string,
): Promise<PurchasedOfferBarcodeResponse> {
  const { tenant, userEmailNormalized } = await getActiveUserTenantContext(tenantPublicId, userEmail);

  const purchase = await prisma.purchase.findFirst({
    where: {
      publicId: purchasePublicId,
      tenantId: tenant.id,
      userEmailNormalized,
      status: "PAID",
      issuedBenefit: { isNot: null },
    },
    include: {
      offer: true,
      issuedBenefit: true,
    },
  });

  if (!purchase) {
    throw new AppError("NOT_FOUND", "Paid purchase barcode was not found");
  }

  return {
    purchaseId: purchase.publicId,
    offerId: purchase.offer.publicId,
    title: purchase.offer.title,
    barcode: createDemoBarcode(purchase.publicId),
  };
}

/** Loads and validates the active tenant and user before returning private user data. */
async function getActiveUserTenantContext(tenantPublicId: string, userEmail: string) {
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

  return { tenant, userEmailNormalized };
}

/** Creates a deterministic mock barcode value for a paid demo purchase. */
function createDemoBarcode(purchasePublicId: string): DemoBarcode {
  return {
    value: `NEXUS-DEMO-${purchasePublicId}`,
    format: "CODE_128",
    isMock: true,
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
