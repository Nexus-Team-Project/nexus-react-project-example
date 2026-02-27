import logger from "../logger";
import { sendEmail } from "../email/service";
import { claimAvailableCoupon, getPurchaseForCouponClaim } from "./repository";

// Called after a confirmed sale-complete callback.
// Finds an available coupon for the purchase's offer/tenant, claims it,
// and sends the confirmation email to the buyer.
export async function claimCouponForPurchase(
  transactionId: string,
  buyerEmail: string,
): Promise<void> {
  const purchase = await getPurchaseForCouponClaim(transactionId);

  if (!purchase) {
    logger.warn("claimCouponForPurchase: purchase not found", { transactionId });
    return;
  }

  if (!purchase.offer_id || !purchase.tenant_id) {
    logger.warn("claimCouponForPurchase: purchase missing offer_id or tenant_id", {
      transactionId,
    });
    return;
  }

  const issuedDate = new Date();

  const coupon = await claimAvailableCoupon(
    purchase.offer_id,
    purchase.offer_variant_id,
    purchase.tenant_id,
    {
      purchaseId: purchase.id,
      userEmail: buyerEmail,
      issuedDate,
      expiredDate: purchase.expiration_date,
    },
  );

  if (!coupon) {
    logger.error("claimCouponForPurchase: no available coupon found", {
      transactionId,
      offer_id: purchase.offer_id,
      offer_variant_id: purchase.offer_variant_id,
      tenant_id: purchase.tenant_id,
    });
    return;
  }

  logger.info("Coupon claimed successfully", {
    couponId: coupon.id,
    transactionId,
    buyerEmail,
  });

  if (!coupon.email_template_id) {
    logger.warn("Coupon has no email_template_id — skipping email", {
      couponId: coupon.id,
    });
    return;
  }

  try {
    await sendEmail({
      templateId: coupon.email_template_id,
      subject: "הקופון שלך מוכן",
      fromName: process.env.SENDPULSE_FROM_NAME ?? "Nexus",
      fromEmail: process.env.SENDPULSE_FROM_EMAIL ?? "no-reply@nexus-online.net",
      toEmail: buyerEmail,
      variables: {
        barcode: coupon.barcode ?? "",
        sku: coupon.sku ?? "",
        expired_date: coupon.expired_date?.toISOString().split("T")[0] ?? "",
      },
    });
  } catch (err) {
    // Email failure must not block the callback response — log and continue.
    logger.error("claimCouponForPurchase: failed to send coupon email", {
      couponId: coupon.id,
      buyerEmail,
      error: err instanceof Error ? err.message : err,
    });
  }
}
