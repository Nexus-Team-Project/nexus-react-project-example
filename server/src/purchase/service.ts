import crypto from "crypto";
import { AppError } from "../errors/AppError";
import {
  findUserByEmail,
  findTenantByExternalId,
  getTenantOfferDelta,
  savePurchase,
} from "./repository";
import { PurchaseRequestData } from "./validation";
import axios from "axios";
import logger from "../logger";
import { getOffer, getOfferVariant } from "../offers/repository";
import { fetchOffer, validateOffer } from "../offers/service";

type OfferData = NonNullable<Awaited<ReturnType<typeof getOffer>>>;

export type PaymeSaleResponse = {
  status_code: number;
  sale_url: string;
  payme_sale_id: string;
  payme_sale_code: number;
  price: number;
  transaction_id: string;
  currency: string;
};

// Computes the expiration date for this specific purchase based on offer type.
// Voucher: created_at + time_limit (days)
// Coupon:  offer.expiration_date (shared deadline)
// Other:   null
function computeExpirationDate(
  offer: OfferData,
  purchaseCreatedAt: Date,
): Date | null {
  if (offer.type === "Voucher" && offer.time_limit) {
    const expiration = new Date(purchaseCreatedAt);
    expiration.setDate(expiration.getDate() + offer.time_limit);
    return expiration;
  }
  if (offer.type === "Coupon") {
    return offer.expiration_date;
  }
  return null;
}

async function createPaymeSale(
  data: PurchaseRequestData,
  productName: string,
): Promise<PaymeSaleResponse> {
  if (!process.env.PAYME_ID) {
    logger.error("PayMe not configured — PAYME_ID env var missing");
    throw new AppError(
      500,
      "MERCHANT_PAYME_NOT_CONFIGURED",
      "Merchant PayMe account is not configured",
    );
  }

  const transactionId = crypto.randomUUID();

  const body: Record<string, unknown> = {
    seller_payme_id: "MPL17706-31740YWY-3LV0PBFM-KB8UOOGY",
    sale_price: data.amount,
    currency: "ILS",
    product_name: productName,
    transaction_id: transactionId,
    installments: "1",
    market_fee: 0,
    sale_send_notification: true,
    sale_callback_url: "https://nexus-online.net/_functions/purchaseCallback", //process.env.PAYME_SALE_CALLBACK_URL,
    sale_email: data.email,
    // sale_return_url: process.env.PAYME_SALE_RETURN_URL, //Redirect to this URL after payment success (optional)
    sale_name: data.buyer_name,
    capture_buyer: false,
    buyer_perform_validation: false,
    sale_type: "sale",
    sale_payment_method: "credit-card",
    language: "he",
    buyer_name: data.buyer_name,
    buyer_email: data.buyer_email,
  };

  if (data.buyer_phone) {
    body.sale_mobile = data.buyer_phone;
  }

  const apiUrl = process.env.PAYME_API_URL_DEV;
  if (!apiUrl) {
    logger.error("PAYME_API_URL env variable is not set");
    throw new AppError(
      500,
      "PAYME_URL_NOT_CONFIGURED",
      "PAYME_API_URL env variable is not set",
    );
  }

  const response = await axios.post(apiUrl, body, {
    headers: { "Content-Type": "application/json" },
  });

  if (!response.data || response.status !== 200) {
    logger.error("PayMe API returned unexpected response", {
      status: response.status,
      data: response.data,
    });
    throw new AppError(
      502,
      "PAYME_API_ERROR",
      "Failed to create PayMe payment session",
    );
  }

  const result = response.data as PaymeSaleResponse;

  if (result.status_code !== 0) {
    logger.error("PayMe rejected the sale request", { result });
    throw new AppError(
      502,
      "PAYME_SALE_FAILED",
      "PayMe rejected the sale request",
      JSON.stringify(result),
    );
  }

  return result;
}

export async function createPurchase(
  data: PurchaseRequestData,
): Promise<PaymeSaleResponse> {
  // amount needs to be calculates by the variant_price + tenant_delta.
  logger.info("Creating purchase", {
    offerId: data.offerId,
    offerVariantId: data.offerVariantId,
    tenantId: data.tenantId,
    email: data.buyer_email,
  });
  // Snapshot of OfferVariant.price — set in the variant branch, falls back to
  // data.amount for the direct-offer flow (no variant involved).

  // OfferVariant flow: resolve the parent offer through the variant relation
  const offerVariant = await getOfferVariant(data.offerVariantId);
  if (!offerVariant) {
    logger.warn("OfferVariant not found", {
      offerVariantId: data.offerVariantId,
    });
    throw new AppError(
      404,
      "OFFER_VARIANT_NOT_FOUND",
      "The requested offer variant does not exist",
    );
  }
  validateOffer(offerVariant.offer);
  logger.info("OfferVariant resolved to offer", {
    offerVariantId: offerVariant.id,
    offerId: offerVariant.offer,
    offerType: offerVariant.offer.type,
  });

  const payme = await createPaymeSale(data, offerVariant.offer.title);
  //Finds user by email on users table and connect it to purchase on db.
  const user = await findUserByEmail(data.buyer_email);
  if (!user) {
    logger.warn("User not found during purchase", { email: data.buyer_email });
    throw new AppError(401, "USER_NOT_FOUND", "User not found");
  }

  // Resolve tenant UUID for the FK and to look up tenant_delta
  const tenant = await findTenantByExternalId(data.tenantId);
  if (!tenant) {
    logger.warn("Tenant not found during purchase", {
      tenantId: data.tenantId,
    });
    throw new AppError(401, "TENANT_NOT_FOUND", "Tenant not found");
  }

  // Snapshot tenant_delta at transaction time
  const tenant_delta =
    tenant.id && offerVariant.id
      ? await getTenantOfferDelta(tenant.id, offerVariant.id)
      : 0;

  const purchaseCreatedAt = new Date();
  const expiration_date = computeExpirationDate(
    offerVariant.offer,
    purchaseCreatedAt,
  );

  await savePurchase(data, payme, user.id, {
    offerId: offerVariant.offer.id,
    offerVariantId: offerVariant.id,
    tenantUUID: tenant.id,
    expiration_date,
    variant_price: Number(offerVariant.price),
    tenant_delta,
  });

  logger.info("Purchase created successfully", {
    offerId: offerVariant.offer.id,
    offerVariantId: offerVariant.id,
    offerType: offerVariant.offer.type,
    expiration_date,
    transactionId: payme.transaction_id,
  });

  return payme;
}
