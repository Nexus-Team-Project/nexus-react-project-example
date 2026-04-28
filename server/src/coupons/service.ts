import logger from "../logger";
import { sendEmail } from "../email/service";
import { claimAvailableCoupon, getPurchaseForCouponClaim } from "./repository";

// Called after a confirmed sale-complete callback.
// Finds an available VoucherCode for the purchase's variant, claims it,
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

  if (!purchase.offer_variant_id) {
    logger.warn("claimCouponForPurchase: purchase missing offer_variant_id", {
      transactionId,
    });
    return;
  }

  const issuedDate = new Date();

  const voucherCode = await claimAvailableCoupon(purchase.offer_variant_id, {
    purchaseId: purchase.id,
    issuedDate,
    expiredDate: purchase.expiration_date,
  });

  if (!voucherCode) {
    logger.error("claimCouponForPurchase: no available voucher code found", {
      transactionId,
      offer_variant_id: purchase.offer_variant_id,
    });
    return;
  }

  logger.info("Voucher code claimed successfully", {
    voucherCodeId: voucherCode.id,
    transactionId,
    buyerEmail,
  });

  const emailTemplateId = parseInt(process.env.VOUCHER_EMAIL_TEMPLATE_ID ?? "");
  if (!emailTemplateId) {
    logger.warn("VOUCHER_EMAIL_TEMPLATE_ID not configured — skipping email", {
      voucherCodeId: voucherCode.id,
    });
    return;
  }

  try {
    await sendEmail({
      templateId: emailTemplateId,
      subject: "הקופון שלך מוכן",
      fromName: process.env.SENDPULSE_FROM_NAME ?? "Nexus",
      fromEmail: process.env.SENDPULSE_FROM_EMAIL ?? "no-reply@nexus-online.net",
      toEmail: buyerEmail,
      variables: {
        barcode: voucherCode.barcode ?? "",
        sku: voucherCode.sku ?? "",
        expired_date: voucherCode.expired_date?.toISOString().split("T")[0] ?? "",
      },
    });
  } catch (err) {
    // Email failure must not block the callback response — log and continue.
    logger.error("claimCouponForPurchase: failed to send voucher email", {
      voucherCodeId: voucherCode.id,
      buyerEmail,
      error: err instanceof Error ? err.message : err,
    });
  }
}
