import { Router, Request, Response } from "express";
import { PurchaseStatus } from "@prisma/client";
import logger from "../logger";
import { updatePurchaseByCallback } from "./repository";
import { claimCouponForPurchase } from "../coupons/service";

const router = Router();

// Maps PayMe notify_type values to our PurchaseStatus enum
const NOTIFY_TYPE_TO_STATUS: Record<string, PurchaseStatus> = {
  "sale-complete": "completed",
  "sale-authorized": "authorized",
  refund: "refunded",
  "sale-failure": "failed",
  "sale-chargeback": "chargebacked",
  "sale-chargeback-refund": "refunded",
};

// PayMe callback body shape (based on PayMe docs)
interface PaymeCallbackBody {
  status_code: number;
  status_error_code?: string;
  status_error_details?: string;
  notify_type: string;
  sale_created?: string;
  transaction_id: string;
  payme_sale_id?: string;
  payme_sale_code?: number;
  payme_transaction_id?: string;
  price?: number;
  currency?: string;
  sale_status?: string;
  payme_transaction_card_brand?: string;
  payme_transaction_auth_number?: string;
  buyer_card_mask?: string;
  buyer_name?: string;
  buyer_email?: string;
  buyer_phone?: string;
  installments?: number;
  sale_paid_date?: string;
  sale_release_date?: string;
  is_token_sale?: number;
  payme_signature?: string;
  sale_invoice_url?: string;
}

// POST /purchase/callback  — no auth middleware (PayMe calls this externally)
router.post("/", async (req: Request, res: Response) => {
  const body = req.body as PaymeCallbackBody;

  logger.info("PayMe callback received", {
    notify_type: body.notify_type,
    transaction_id: body.transaction_id,
    payme_sale_id: body.payme_sale_id,
    payme_transaction_id: body.payme_transaction_id,
    status_code: body.status_code,
    sale_status: body.sale_status,
    price: body.price,
    currency: body.currency,
    buyer_email: body.buyer_email,
  });

  // Validate required fields
  if (!body.transaction_id || !body.notify_type) {
    logger.warn("PayMe callback missing required fields", {
      transaction_id: body.transaction_id,
      notify_type: body.notify_type,
    });
    // ACK with 200 — bad data won't improve on retry
    res.status(200).json({ status_code: 0 });
    return;
  }

  // Log PayMe-level errors reported in the callback
  if (body.status_code === 1) {
    logger.error("PayMe callback reported a payment error", {
      status_error_code: body.status_error_code,
      status_error_details: body.status_error_details,
      transaction_id: body.transaction_id,
      notify_type: body.notify_type,
    });
  }

  const newStatus = NOTIFY_TYPE_TO_STATUS[body.notify_type];
  if (!newStatus) {
    logger.warn("PayMe callback received unknown notify_type — ignoring", {
      notify_type: body.notify_type,
      transaction_id: body.transaction_id,
    });
    res.status(200).json({ status_code: 0 });
    return;
  }

  try {
    await updatePurchaseByCallback(body.transaction_id, {
      status: newStatus,
      payme_transaction_id: body.payme_transaction_id ?? null,
    });

    logger.info("Purchase status updated from PayMe callback", {
      transaction_id: body.transaction_id,
      notify_type: body.notify_type,
      new_status: newStatus,
      payme_transaction_id: body.payme_transaction_id,
      payme_sale_id: body.payme_sale_id,
    });
  } catch (error) {
    logger.error("Failed to update purchase status from PayMe callback", {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      transaction_id: body.transaction_id,
      notify_type: body.notify_type,
      attempted_status: newStatus,
    });
  }

  // On confirmed payment: claim a coupon and send it to the buyer.
  if (newStatus === "completed" && body.buyer_email) {
    claimCouponForPurchase(body.transaction_id, body.buyer_email).catch(
      (err) => {
        logger.error("claimCouponForPurchase threw unexpectedly", {
          transaction_id: body.transaction_id,
          error: err instanceof Error ? err.message : err,
        });
      },
    );
  }

  res.status(200).json({ status_code: 0 });
});

export default router;
