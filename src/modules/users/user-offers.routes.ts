/** This file registers user purchased-offer status and barcode routes. */
import type { FastifyInstance, FastifyRequest } from "fastify";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors.js";
import { normalizeEmail } from "../../shared/strings.js";
import { requireAuth, requirePartnerForTenant, requireUserForEmail } from "../auth/auth.middleware.js";
import { userBarcodeParamsSchema, userStatusParamsSchema } from "./user-offers.schemas.js";
import { getPurchasedOfferBarcode, getPurchasedOffersForUser } from "./user-offers.service.js";

/** Adds GET /offers/status/:tenant/:userEmail for user benefit status. */
export async function registerUserOfferRoutes(app: FastifyInstance): Promise<void> {
  app.get("/offers/status/:tenant/:userEmail", { preHandler: requireAuth }, async (request) => {
    const params = userStatusParamsSchema.parse(request.params);
    const email = normalizeEmail(params.userEmail);

    // Documentation "Try it Out" mock interceptor
    if (request.headers.authorization === `Bearer ${env.DEMO_USER_TOKEN}`) {
      return [
        {
          purchaseId: "purchase_abc123",
          offerId: "offer_98765",
          title: "Digital Gift Card (Demo)",
          status: "active",
          purchasedAt: new Date().toISOString()
        }
      ];
    }

    authorizeUserStatusRead(request, params.tenant, email);
    return getPurchasedOffersForUser(params.tenant, email);
  });

  app.get("/offers/barcodes/:tenant/:userEmail/:purchaseId", { preHandler: requireAuth }, async (request) => {
    const params = userBarcodeParamsSchema.parse(request.params);
    const email = normalizeEmail(params.userEmail);

    // Documentation "Try it Out" mock interceptor
    if (request.headers.authorization === `Bearer ${env.DEMO_USER_TOKEN}`) {
      return {
        purchaseId: params.purchaseId,
        barcode: "123456789012",
        status: "active"
      };
    }

    authorizeUserStatusRead(request, params.tenant, email);
    return getPurchasedOfferBarcode(params.tenant, email, params.purchaseId);
  });
}

/** Allows users to read their own benefits and local partner demos to inspect status data. */
function authorizeUserStatusRead(request: FastifyRequest, tenantPublicId: string, userEmailNormalized: string): void {
  if (request.auth?.type === "PARTNER" && env.ALLOW_PARTNER_STATUS_READS && env.NODE_ENV !== "production") {
    requirePartnerForTenant(request, tenantPublicId);
    return;
  }

  if (request.auth?.type !== "USER") {
    throw new AppError("UNAUTHORIZED", "User bearer token is required");
  }

  requireUserForEmail(request, userEmailNormalized);
}
