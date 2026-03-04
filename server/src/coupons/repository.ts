import prisma from "../prisma";

// Fetch a purchase with all fields needed for voucher code claiming.
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
  issuedDate: Date;
  expiredDate: Date | null;
};

// Atomically find the first available VoucherCode for the given variant,
// claim it, and link it to the purchase. Returns the claimed code or null.
export const claimAvailableCoupon = async (
  variantId: string,
  data: ClaimCouponData,
) => {
  return await prisma.$transaction(async (tx) => {
    const voucherCode = await tx.voucherCode.findFirst({
      where: {
        variant_id: variantId,
        status: "available",
        purchase_id: null,
      },
    });

    if (!voucherCode) return null;

    return await tx.voucherCode.update({
      where: { id: voucherCode.id },
      data: {
        purchase_id: data.purchaseId,
        issued_date: data.issuedDate,
        expired_date: data.expiredDate,
        status: "issued",
      },
    });
  });
};
