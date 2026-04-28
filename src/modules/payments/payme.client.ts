/** This file contains the isolated PayMe payment provider adapter. */
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors.js";
import { redactSensitive } from "../../shared/security.js";
import { paymeGenerateSaleResponseSchema, paymeWebhookSchema } from "./payme.schemas.js";
import type { CreatePaymentSessionInput, CreatePaymentSessionOutput, ParsedPaymentEvent, PaymentProvider } from "./payment-provider.js";

const PAYME_REQUEST_TIMEOUT_MS = 15_000;

/** Creates PayMe-hosted payment sessions or a safe local mock session. */
export class PayMeClient implements PaymentProvider {
  /** Creates a payment session and returns only the checkout URL to callers. */
  public async createPaymentSession(input: CreatePaymentSessionInput): Promise<CreatePaymentSessionOutput> {
    if (env.PAYME_BASE_URL === "mock") {
      const providerSessionId = `mock_${input.purchaseId}`;
      return {
        providerSessionId,
        checkoutUrl: `${env.PUBLIC_API_BASE_URL}/test/payments/${providerSessionId}`,
        rawResponse: redactSensitive({ providerSessionId, mode: "mock", input }),
      };
    }

    const requestPayload = buildGenerateSalePayload(input);
    const responseJson = await postGenerateSale(requestPayload);
    const parsedResponse = paymeGenerateSaleResponseSchema.safeParse(responseJson);

    if (!parsedResponse.success) {
      throw new AppError("PAYMENT_PROVIDER_ERROR", "PayMe returned an invalid payment response", parsedResponse.error.flatten());
    }

    if (parsedResponse.data.status_code !== 0) {
      throw new AppError("PAYMENT_PROVIDER_ERROR", "PayMe rejected the payment session request", redactSensitive(parsedResponse.data));
    }

    return {
      providerSaleId: parsedResponse.data.payme_sale_id,
      checkoutUrl: parsedResponse.data.sale_url,
      rawResponse: redactSensitive(parsedResponse.data),
      ...(parsedResponse.data.session ? { providerSessionId: parsedResponse.data.session } : {}),
    };
  }

  /** Verifies webhook HMAC when a secret is configured and present. */
  public async verifyWebhook(headers: Record<string, string | string[] | undefined>, rawBody: string): Promise<boolean> {
    const signature = headers["x-payme-signature"];
    const signatureValue = Array.isArray(signature) ? signature[0] : signature;

    if (!signatureValue) {
      return env.NODE_ENV !== "production";
    }

    const expected = createHmac("sha256", env.PAYME_WEBHOOK_SECRET).update(rawBody).digest("hex");
    const provided = signatureValue.replace(/^sha256=/, "");

    try {
      return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"));
    } catch {
      return false;
    }
  }

  /** Parses a validated payment webhook body into the internal event shape. */
  public async parseWebhook(rawBody: string): Promise<ParsedPaymentEvent> {
    const parsedJson = JSON.parse(rawBody) as unknown;
    const parsed = paymeWebhookSchema.parse(parsedJson);
    return {
      purchaseId: parsed.purchaseId,
      amount: parsed.amount,
      currency: parsed.currency,
      status: parsed.status,
      rawPayload: redactSensitive(parsedJson),
      ...(parsed.eventId ? { eventId: parsed.eventId } : {}),
      ...(parsed.providerSessionId ? { providerSessionId: parsed.providerSessionId } : {}),
      ...(parsed.providerSaleId ? { providerSaleId: parsed.providerSaleId } : {}),
    };
  }
}

export const paymentProvider = new PayMeClient();

interface PayMeGenerateSalePayload {
  seller_payme_id: string;
  sale_price: number;
  currency: string;
  product_name: string;
  transaction_id: string;
  installments: string;
  market_fee: number;
  sale_send_notification: boolean;
  sale_callback_url: string;
  sale_email: string;
  sale_return_url: string;
  sale_mobile: string;
  sale_name: string;
  capture_buyer: boolean;
  buyer_perform_validation: boolean;
  sale_type: "sale";
  sale_payment_method: "credit-card";
  layout: string;
  language: "he" | "en";
}

/** Builds the PayMe generate-sale request using the hosted payment page contract. */
function buildGenerateSalePayload(input: CreatePaymentSessionInput): PayMeGenerateSalePayload {
  return {
    seller_payme_id: env.PAYME_SELLER_ID,
    sale_price: convertIlsToAgorot(input.amount),
    currency: input.currency,
    product_name: input.title,
    transaction_id: input.purchaseId,
    installments: "1",
    market_fee: 0,
    sale_send_notification: true,
    sale_callback_url: input.callbackUrl,
    sale_email: input.customer.buyerEmail,
    sale_return_url: input.successUrl,
    sale_mobile: input.customer.buyerPhone,
    sale_name: input.customer.buyerName,
    capture_buyer: false,
    buyer_perform_validation: false,
    sale_type: "sale",
    sale_payment_method: "credit-card",
    layout: "default",
    language: "he",
  };
}

/** Converts an ILS amount string into PayMe agorot, where 100 agorot is 1 ILS. */
function convertIlsToAgorot(amount: string): number {
  return Math.round(Number(amount) * 100);
}

/** Calls PayMe generate-sale with timeout protection and no raw card data. */
async function postGenerateSale(payload: PayMeGenerateSalePayload): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PAYME_REQUEST_TIMEOUT_MS);

  try {
    const baseUrl = env.PAYME_BASE_URL.endsWith("/") ? env.PAYME_BASE_URL : `${env.PAYME_BASE_URL}/`;
    const response = await fetch(new URL("generate-sale", baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.PAYME_API_KEY}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const responseJson = await response.json() as unknown;
    if (!response.ok) {
      throw new AppError("PAYMENT_PROVIDER_ERROR", "PayMe generate-sale request failed", redactSensitive(responseJson));
    }

    return responseJson;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("PAYMENT_PROVIDER_ERROR", "PayMe generate-sale request could not be completed");
  } finally {
    clearTimeout(timeout);
  }
}
