/** This file defines the payment provider interface used by purchase services. */

export interface CreatePaymentSessionInput {
  purchaseId: string;
  amount: string;
  currency: string;
  title: string;
  customer: {
    email: string;
    buyerName: string;
    buyerEmail: string;
    buyerPhone: string;
    fullName?: string;
    phone?: string;
  };
  successUrl: string;
  failureUrl: string;
  callbackUrl: string;
}

export interface CreatePaymentSessionOutput {
  providerSessionId?: string;
  providerSaleId?: string;
  checkoutUrl: string;
  rawResponse: unknown;
}

export type ParsedPaymentStatus = "paid" | "failed" | "cancelled" | "expired" | "refunded";

export interface ParsedPaymentEvent {
  eventId?: string;
  purchaseId: string;
  providerSessionId?: string;
  providerSaleId?: string;
  amount: string;
  currency: string;
  status: ParsedPaymentStatus;
  rawPayload: unknown;
}

export interface PaymentProvider {
  createPaymentSession(input: CreatePaymentSessionInput): Promise<CreatePaymentSessionOutput>;
  verifyWebhook(headers: Record<string, string | string[] | undefined>, rawBody: string): Promise<boolean>;
  parseWebhook(rawBody: string): Promise<ParsedPaymentEvent>;
}
