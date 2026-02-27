import prisma from "../prisma";

// Fetch a purchase with all fields needed for coupon claiming.
export const getPurchaseForCouponClaim = async (transactionId: string) => {
  return await prisma.purchase.findUnique({
    where: { transaction_id: transactionId },
    select: {
      id: true,
      offer_id: true,
      offer_variant_id: true,
      tenant_id: true,
      expiration_date: true,
      user: { select: { email: true } },
    },
  });
};

export type ClaimCouponData = {
  purchaseId: string;
  userEmail: string;
  issuedDate: Date;
  expiredDate: Date | null;
};

// Atomically find the first available coupon matching the purchase context
// and mark it as used. Returns the claimed coupon, or null if none available.
export const claimAvailableCoupon = async (
  offerId: string,
  offerVariantId: string | null | undefined,
  tenantId: string,
  data: ClaimCouponData,
) => {
  return await prisma.$transaction(async (tx) => {
    const coupon = await tx.coupon.findFirst({
      where: {
        offer_id: offerId,
        offer_variant_id: offerVariantId ?? null,
        tenant_id: tenantId,
        status: "available",
        purchase_id: null,
      },
    });

    if (!coupon) return null;

    return await tx.coupon.update({
      where: { id: coupon.id },
      data: {
        purchase_id: data.purchaseId,
        user_email: data.userEmail,
        issued_date: data.issuedDate,
        expired_date: data.expiredDate,
        status: "used",
      },
    });
  });
};
