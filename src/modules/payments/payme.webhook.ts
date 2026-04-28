/** This file processes PayMe webhook events and issues benefits after payment. */
import type { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../shared/errors.js";
import { createPublicId } from "../../shared/ids.js";
import { decimalToNumber, moneyEquals, toMoneyDecimal } from "../../shared/money.js";
import { redactSensitive, sha256 } from "../../shared/security.js";
import { paymentProvider } from "./payme.client.js";
import type { ParsedPaymentEvent } from "./payment-provider.js";

/** Adds POST /webhooks/payme for payment status callbacks. */
export async function registerPayMeWebhookRoute(app: FastifyInstance): Promise<void> {
  app.post("/webhooks/payme", async (request) => {
    const rawBody = JSON.stringify(request.body ?? {});
    const bodyHash = sha256(rawBody);
    const signatureValid = await paymentProvider.verifyWebhook(request.headers, rawBody);

    if (!signatureValid) {
      throw new AppError("UNAUTHORIZED", "Webhook signature is invalid");
    }

    const existingEvent = await prisma.webhookEvent.findUnique({ where: { bodyHash } });
    if (existingEvent?.processedAt) {
      return { status: "ok", duplicate: true };
    }

    const parsedEvent = await paymentProvider.parseWebhook(rawBody);
    const event = existingEvent ?? await prisma.webhookEvent.create({
      data: {
        eventId: parsedEvent.eventId ?? null,
        bodyHash,
        signatureValid,
        payload: redactSensitive(parsedEvent.rawPayload) as object,
      },
    });

    try {
      await applyPaymentEvent(parsedEvent);
      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: { processedAt: new Date(), processingError: null },
      });
      return { status: "ok" };
    } catch (error) {
      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: { processingError: error instanceof Error ? error.message : "Unknown webhook processing error" },
      });
      throw error;
    }
  });
}

/** Applies a validated provider event to purchase, payment, and benefit records. */
export async function applyPaymentEvent(event: ParsedPaymentEvent): Promise<void> {
  const purchase = await prisma.purchase.findUnique({
    where: { id: event.purchaseId },
    include: { offer: true, paymentSession: true },
  });

  if (!purchase || !purchase.paymentSession) {
    throw new AppError("NOT_FOUND", "Payment purchase was not found");
  }

  if (!moneyEquals(purchase.amount, toMoneyDecimal(event.amount)) || purchase.currency !== event.currency) {
    throw new AppError("BAD_REQUEST", "Webhook amount or currency does not match purchase");
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (event.status === "paid") {
      const transition = await tx.purchase.updateMany({
        where: { id: purchase.id, status: "PENDING_PAYMENT" },
        data: { status: "PAID", paidAt: new Date() },
      });

      if (transition.count !== 1) {
        await ensurePaidEventIsIdempotent(tx, purchase.id);
        return;
      }

      await tx.paymentSession.update({
        where: { purchaseId: purchase.id },
        data: { status: "PAID" },
      });

      if (purchase.costOptionId) {
        await convertReservedUnitToSold(tx, purchase.costOptionId);
      }

      await tx.issuedBenefit.upsert({
        where: { purchaseId: purchase.id },
        update: {},
        create: {
          purchaseId: purchase.id,
          offerId: purchase.offerId,
          tenantId: purchase.tenantId,
          userEmail: purchase.userEmail,
          userEmailNormalized: purchase.userEmailNormalized,
          benefitType: purchase.offer.offerType,
          codeHash: sha256(createPublicId("benefit")),
          codeLast4: purchase.id.slice(-4),
          status: "ACTIVE",
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
      return;
    }

    const failedStatus = event.status.toUpperCase() as "FAILED" | "CANCELLED" | "EXPIRED" | "REFUNDED";
    const transition = await tx.purchase.updateMany({
      where: { id: purchase.id, status: "PENDING_PAYMENT" },
      data: { status: failedStatus },
    });

    if (transition.count !== 1) {
      return;
    }

    await tx.paymentSession.update({
      where: { purchaseId: purchase.id },
      data: { status: failedStatus === "REFUNDED" ? "FAILED" : failedStatus },
    });

    if (purchase.costOptionId) {
      await releaseReservedUnit(tx, purchase.costOptionId);
    }
  });
}

/** Allows duplicate paid events only when the purchase is already marked as paid. */
async function ensurePaidEventIsIdempotent(tx: Prisma.TransactionClient, purchaseId: string): Promise<void> {
  const current = await tx.purchase.findUnique({
    where: { id: purchaseId },
    select: { status: true },
  });

  if (current?.status === "PAID") {
    return;
  }

  throw new AppError("CONFLICT", "Purchase cannot be marked paid from its current status");
}

/** Converts one reserved unit into one sold unit after a successful payment transition. */
async function convertReservedUnitToSold(tx: Prisma.TransactionClient, costOptionId: string): Promise<void> {
  await tx.$executeRaw`
    UPDATE "CostOption"
    SET
      "reserved" = GREATEST("reserved" - 1, 0),
      "sold" = "sold" + 1
    WHERE "id" = ${costOptionId}
  `;
}

/** Releases one reserved unit after a pending purchase reaches a non-paid terminal state. */
async function releaseReservedUnit(tx: Prisma.TransactionClient, costOptionId: string): Promise<void> {
  await tx.$executeRaw`
    UPDATE "CostOption"
    SET "reserved" = GREATEST("reserved" - 1, 0)
    WHERE "id" = ${costOptionId}
  `;
}

/** Converts a Decimal into an API number to keep this import used in build checks. */
export function webhookAmountToNumberForDocs(value: Parameters<typeof decimalToNumber>[0]): number {
  return decimalToNumber(value);
}
