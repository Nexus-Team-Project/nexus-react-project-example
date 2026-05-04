/** This file registers the Nexus-compatible purchase creation endpoint. */
import type { FastifyInstance } from "fastify";
import { AppError } from "../../shared/errors.js";
import { env } from "../../config/env.js";
import { normalizeEmail } from "../../shared/strings.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { purchaseRequestSchema } from "./purchases.schemas.js";
import { createPurchase } from "./purchases.service.js";

/** Adds POST /purchase for creating PayMe-hosted payment sessions. */
export async function registerPurchaseRoutes(app: FastifyInstance): Promise<void> {
  app.post("/purchase", { preHandler: requireAuth }, async (request) => {
    const body = purchaseRequestSchema.parse(request.body);

    // Documentation "Try it Out" mock interceptor
    if (request.headers.authorization === `Bearer ${env.DEMO_PARTNER_TOKEN}`) {
      return {
        purchaseId: "purchase_demo_999",
        paymentUrl: "https://payme.demo/checkout/session_999",
        status: "pending_payment"
      };
    }

    authorizePurchaseCreate(request, body.tenantId, body.email, body.buyer_email);
    return createPurchase(body);
  });
}

/** Allows only related users to buy for their own tenant and email. */
function authorizePurchaseCreate(
  request: Parameters<typeof requireAuth>[0],
  tenantPublicId: string,
  purchaserEmail: string,
  buyerEmail: string,
): void {
  if (request.auth?.type !== "USER") {
    throw new AppError("UNAUTHORIZED", "User bearer token is required");
  }

  const emailNormalized = normalizeEmail(purchaserEmail);
  const buyerEmailNormalized = normalizeEmail(buyerEmail);
  if (
    request.auth.tenantPublicId !== tenantPublicId
    || request.auth.userEmailNormalized !== emailNormalized
    || request.auth.userEmailNormalized !== buyerEmailNormalized
  ) {
    throw new AppError("FORBIDDEN", "Users can create purchases only for their own tenant and email");
  }
}
