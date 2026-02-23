import crypto from "crypto";
import { AppError } from "../errors/AppError";
import { getOffer, savePurchase } from "./repository";
import { PurchaseRequestData } from "./validation";
import axios from "axios";

type Offer = NonNullable<Awaited<ReturnType<typeof getOffer>>>;

export type PaymeSaleResponse = {
  status_code: number;
  sale_url: string;
  payme_sale_id: string;
  payme_sale_code: number;
  price: number;
  transaction_id: string;
  currency: string;
};

async function fetchOffer(offerId: string): Promise<Offer> {
  console.log(`[fetchOffer] ${offerId}`);
  const offer = await getOffer(offerId);
  if (!offer) {
    throw new AppError(
      404,
      "OFFER_NOT_FOUND",
      "The requested offer does not exist",
    );
  }

  const isAvailable =
    offer.status === "active" &&
    offer.available_quantity !== null &&
    offer.available_quantity > 0;

  if (!isAvailable) {
    throw new AppError(
      409,
      "NO_AVAILABILITY",
      "The requested offer is no longer available",
    );
  }

  return offer;
}

async function createPaymeSale(
  offer: Offer,
  data: PurchaseRequestData,
): Promise<PaymeSaleResponse> {
  const { merchant } = offer;
  console.log(`[createPaymeSale] ${offer.title}`);
  console.log({ paymeId: process.env.PAYME_ID });

  if (
    // !merchant?.payme_seller_id ||
    // !merchant?.payme_api_key ||
    !process.env.PAYME_ID
  ) {
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
    product_name: offer.title,
    transaction_id: transactionId,
    installments: "1",
    market_fee: 0,
    sale_send_notification: true,
    // sale_callback_url: process.env.PAYME_SALE_CALLBACK_URL,
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

  const apiUrl = process.env.PAYME_API_URL;
  if (!apiUrl) {
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
    throw new AppError(
      502,
      "PAYME_API_ERROR",
      "Failed to create PayMe payment session",
    );
  }

  const result = response.data as PaymeSaleResponse;

  if (result.status_code !== 0) {
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
  console.log("Im here on the createPurchase function");
  const offer = await fetchOffer(data.offerId);
  const payme = await createPaymeSale(offer, data);
  await savePurchase(data, payme);
  return payme;
}
