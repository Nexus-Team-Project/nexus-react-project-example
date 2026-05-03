/** This file registers Nexus-compatible public offer routes. */
import type { FastifyInstance } from "fastify";
import { requireAccountForTenant, requireAuth } from "../auth/auth.middleware.js";
import { offerListQuerySchema, offerLookupParamsSchema } from "./offers.schemas.js";
import { resolveOfferRoute } from "./offers.service.js";

/** Adds GET /offers/:id for tenant offer lists and offer details. */
export async function registerOfferRoutes(app: FastifyInstance): Promise<void> {
  app.get("/offers/:id", { preHandler: requireAuth }, async (request) => {
    const params = offerLookupParamsSchema.parse(request.params);
    const query = offerListQuerySchema.parse(request.query);

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
