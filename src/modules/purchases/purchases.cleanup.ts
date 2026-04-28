/** This file releases inventory reservations for abandoned pending purchases. */
import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

const EXPIRED_PURCHASE_CLEANUP_INTERVAL_MS = 60_000;
const EXPIRED_PURCHASE_CLEANUP_BATCH_SIZE = 100;

export interface ExpiredPurchaseCleanupResult {
  expiredPurchases: number;
  releasedReservations: number;
}

export interface ExpiredPurchaseCleanupJob {
  stop: () => void;
}

interface ExpiredPurchaseCandidate {
  id: string;
  costOptionId: string | null;
}

/** Expires old pending purchases and releases their reserved inventory units. */
export async function cleanupExpiredPendingPurchases(now = new Date()): Promise<ExpiredPurchaseCleanupResult> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const candidates = await tx.purchase.findMany({
      where: {
        status: "PENDING_PAYMENT",
        expiresAt: { lte: now },
      },
      select: {
        id: true,
        costOptionId: true,
      },
      orderBy: { expiresAt: "asc" },
      take: EXPIRED_PURCHASE_CLEANUP_BATCH_SIZE,
    });

    let expiredPurchases = 0;
    let releasedReservations = 0;

    for (const candidate of candidates) {
      const result = await expirePendingPurchase(tx, candidate);
      expiredPurchases += result.expiredPurchases;
      releasedReservations += result.releasedReservations;
    }

    return { expiredPurchases, releasedReservations };
  });
}

/** Starts the periodic expired-purchase cleanup loop and returns a stop handle. */
export function startExpiredPurchaseCleanupJob(input: {
  logError: (error: unknown, message: string) => void;
  logInfo: (data: ExpiredPurchaseCleanupResult, message: string) => void;
}): ExpiredPurchaseCleanupJob {
  let cleanupRunning = false;

  const runCleanup = async (): Promise<void> => {
    if (cleanupRunning) {
      return;
    }

    cleanupRunning = true;
    try {
      const result = await cleanupExpiredPendingPurchases();
      if (result.expiredPurchases > 0 || result.releasedReservations > 0) {
        input.logInfo(result, "Expired pending purchases were cleaned up");
      }
    } catch (error) {
      input.logError(error, "Expired pending purchase cleanup failed");
    } finally {
      cleanupRunning = false;
    }
  };

  void runCleanup();
  const interval = setInterval(() => {
    void runCleanup();
  }, EXPIRED_PURCHASE_CLEANUP_INTERVAL_MS);

  return {
    stop: () => {
      clearInterval(interval);
    },
  };
}

/** Moves one pending purchase to expired and releases its reservation once. */
async function expirePendingPurchase(
  tx: Prisma.TransactionClient,
  candidate: ExpiredPurchaseCandidate,
): Promise<ExpiredPurchaseCleanupResult> {
  const transition = await tx.purchase.updateMany({
    where: {
      id: candidate.id,
      status: "PENDING_PAYMENT",
    },
    data: { status: "EXPIRED" },
  });

  if (transition.count !== 1) {
    return { expiredPurchases: 0, releasedReservations: 0 };
  }

  await tx.paymentSession.updateMany({
    where: { purchaseId: candidate.id },
    data: { status: "EXPIRED" },
  });

  if (!candidate.costOptionId) {
    return { expiredPurchases: 1, releasedReservations: 0 };
  }

  await releaseReservedUnit(tx, candidate.costOptionId);
  return { expiredPurchases: 1, releasedReservations: 1 };
}

/** Releases one reserved inventory unit without allowing the counter below zero. */
async function releaseReservedUnit(tx: Prisma.TransactionClient, costOptionId: string): Promise<void> {
  await tx.$executeRaw`
    UPDATE "CostOption"
    SET "reserved" = GREATEST("reserved" - 1, 0)
    WHERE "id" = ${costOptionId}
  `;
}
