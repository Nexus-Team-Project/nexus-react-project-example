/** This file registers the Nexus-compatible purchase creation endpoint. */
import type { FastifyInstance } from "fastify";
import { requireAuth, requirePartnerForTenant } from "../auth/auth.middleware.js";
import { purchaseRequestSchema } from "./purchases.schemas.js";
import { createPurchase } from "./purchases.service.js";

/** Adds POST /purchase for creating PayMe-hosted payment sessions. */
export async function registerPurchaseRoutes(app: FastifyInstance): Promise<void> {
  app.post("/purchase", { preHandler: requireAuth }, async (request) => {
    const body = purchaseRequestSchema.parse(request.body);
    requirePartnerForTenant(request, body.tenantId);
    return createPurchase(body);
  });
}
