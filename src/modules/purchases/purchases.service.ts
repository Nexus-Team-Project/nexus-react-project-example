/** This file implements the purchase flow before redirecting users to PayMe. */
import type { Prisma } from "@prisma/client";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors.js";
import { createPublicId } from "../../shared/ids.js";
import { moneyEquals, toMoneyDecimal } from "../../shared/money.js";
import { normalizeEmail, normalizePhone } from "../../shared/strings.js";
import { paymentProvider } from "../payments/payme.client.js";
import type { PurchaseRequest } from "./purchases.schemas.js";
import { createPaymentSessionRecord, getPurchaseContext, getPurchasePrisma } from "./purchases.repository.js";

type PurchaseContext = NonNullable<Awaited<ReturnType<typeof getPurchaseContext>>>;
type OfferWithOptions = PurchaseContext["offers"][number];

/** Creates a pending purchase and returns a hosted checkout URL. */
export async function createPurchase(input: PurchaseRequest): Promise<{ paymentSessionUrl: string }> {
  const emailNormalized = normalizeEmail(input.email);
  const buyerEmailNormalized = normalizeEmail(input.buyer_email);

  if (emailNormalized !== buyerEmailNormalized) {
    throw new AppError("BAD_REQUEST", "Purchaser email and buyer email must match");
  }

  const context = await getPurchaseContext({
    tenantId: input.tenantId,
    offerId: input.offerId,
    emailNormalized,
  });

  if (!context) {
    throw new AppError("NOT_FOUND", "Tenant was not found");
  }

  const user = context.users[0];
  const offer = context.offers[0];
  if (!user) {
    throw new AppError("NOT_FOUND", "Active user was not found for tenant");
  }
  if (!offer) {
    throw new AppError("NOT_FOUND", "Offer was not found");
  }

  const amount = toMoneyDecimal(input.amount);
  const selected = findMatchingCostOption(offer, amount);
  if (!selected) {
    throw new AppError("BAD_REQUEST", "Amount does not match an available cost option");
  }

  const publicId = createPublicId("purchase");
  const purchase = await getPurchasePrisma().$transaction(async (tx: Prisma.TransactionClient) => {
    const freshOption = await tx.costOption.findUnique({ where: { id: selected.costOption.id } });
    if (!freshOption || freshOption.status !== "ACTIVE" || freshOption.available - freshOption.reserved - freshOption.sold <= 0) {
      throw new AppError("CONFLICT", "Offer is no longer available");
    }

    return tx.purchase.create({
      data: {
        publicId,
        tenantId: context.id,
        userId: user.id,
        offerId: offer.id,
        subOfferId: selected.subOffer.id,
        costOptionId: selected.costOption.id,
        userEmail: input.email,
        userEmailNormalized: emailNormalized,
        buyerName: input.buyer_name,
        buyerEmail: input.buyer_email,
        buyerPhone: normalizePhone(input.buyer_phone),
        amount,
        currency: selected.costOption.currency,
        receiptFullName: input.receiptDetails.fullName ?? null,
        receiptEmail: input.receiptDetails.email ?? null,
        receiptPhone: input.receiptDetails.phone ? normalizePhone(input.receiptDetails.phone) : null,
        receiptNotes: input.receiptDetails.notes ?? null,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
  });

  const customer = {
    email: user.email,
    buyerName: input.buyer_name,
    buyerEmail: input.buyer_email,
    buyerPhone: normalizePhone(input.buyer_phone),
    ...(input.receiptDetails.fullName ? { fullName: input.receiptDetails.fullName } : {}),
    ...(input.receiptDetails.phone ? { phone: input.receiptDetails.phone } : {}),
  };

  const paymentInput = {
    purchaseId: purchase.id,
    amount: amount.toFixed(2),
    currency: selected.costOption.currency,
    title: offer.title,
    customer,
    successUrl: env.PAYMENT_SUCCESS_URL,
    failureUrl: env.PAYMENT_FAILURE_URL,
    callbackUrl: `${env.PUBLIC_API_BASE_URL}/webhooks/payme`,
  };

  const paymentSession = await paymentProvider.createPaymentSession(paymentInput);
  await createPaymentSessionRecord({
    purchaseId: purchase.id,
    providerEnvironment: env.PAYME_ENV === "production" ? "PRODUCTION" : "SANDBOX",
    checkoutUrl: paymentSession.checkoutUrl,
    requestPayload: paymentInput,
    responsePayload: paymentSession.rawResponse,
    ...(paymentSession.providerSessionId ? { providerSessionId: paymentSession.providerSessionId } : {}),
    ...(paymentSession.providerSaleId ? { providerSaleId: paymentSession.providerSaleId } : {}),
  });

  return { paymentSessionUrl: paymentSession.checkoutUrl };
}

/** Selects the active cost option that supports the requested amount. */
function findMatchingCostOption(offer: OfferWithOptions, amount: ReturnType<typeof toMoneyDecimal>) {
  for (const subOffer of offer.subOffers) {
    for (const costOption of subOffer.costOptions) {
      const remaining = costOption.available - costOption.reserved - costOption.sold;
      if (remaining <= 0) {
        continue;
      }

      const isFixedMatch = costOption.type === "FIXED" && costOption.cost && moneyEquals(costOption.cost, amount);
      const isCustomMatch = costOption.type === "CUSTOM"
        && costOption.minAmount
        && costOption.maxAmount
        && amount.greaterThanOrEqualTo(costOption.minAmount)
        && amount.lessThanOrEqualTo(costOption.maxAmount);

      if (isFixedMatch || isCustomMatch) {
        return { subOffer, costOption };
      }
    }
  }

  return null;
}
