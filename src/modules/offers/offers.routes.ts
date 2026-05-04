/** This file registers Nexus-compatible public offer routes. */
import type { FastifyInstance } from "fastify";
import { requireAccountForTenant, requireAuth } from "../auth/auth.middleware.js";
import { offerListQuerySchema, offerLookupParamsSchema } from "./offers.schemas.js";
import { resolveOfferRoute } from "./offers.service.js";
import { env } from "../../config/env.js";

/** Adds GET /offers/:id for tenant offer lists and offer details. */
export async function registerOfferRoutes(app: FastifyInstance): Promise<void> {
  app.get("/offers/:id", { preHandler: requireAuth }, async (request) => {
    const params = offerLookupParamsSchema.parse(request.params);
    const query = offerListQuerySchema.parse(request.query);

    // Documentation "Try it Out" mock interceptor
    if (request.headers.authorization === `Bearer ${env.DEMO_PARTNER_TOKEN}`) {
      if (params.id === "tenant_001") {
        return {
          offers: [
            {
              offerId: "offer_98765",
              image: "https://cdn.nexus.com/offers/offer_98765.jpg",
              title: "Digital Gift Card (Demo)",
              summary: "Use this gift card across multiple partner stores",
              price: 100
            },
            {
              offerId: "offer_54321",
              image: "https://cdn.nexus.com/offers/offer_54321.jpg",
              title: "Online Shopping Voucher (Demo)",
              summary: "Redeemable for online purchases only",
              price: 50
            }
          ]
        };
      }
      return {
        offerId: params.id,
        title: "Demo Offer Details",
        description: "This is a high-end demo offer for API testing purposes.",
        price: 250,
        currency: "ILS",
        image: "https://cdn.nexus.com/offers/demo.jpg",
        terms: "Demo terms and conditions apply."
      };
    }

    const routeInput = {
      id: params.id,
      page: query.page,
      pageSize: query.pageSize,
      assertTenantAccess: (tenantId: string) => requireAccountForTenant(request, tenantId),
      ...(query.category ? { category: query.category } : {}),
    };

    return resolveOfferRoute(routeInput);
  });
}
