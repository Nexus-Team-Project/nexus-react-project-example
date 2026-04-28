/** This file registers tenant aggregate offer statistics routes. */
import type { FastifyInstance } from "fastify";
import { AppError } from "../../shared/errors.js";
import { requireAuth, requirePartnerForTenant } from "../auth/auth.middleware.js";
import { statsParamsSchema, statsQuerySchema } from "./stats.schemas.js";
import { getOfferStats } from "./stats.service.js";

/** Adds GET /offers/status/:tenant for paid purchase statistics. */
export async function registerStatsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/offers/status/:tenant", { preHandler: requireAuth }, async (request) => {
    const params = statsParamsSchema.parse(request.params);
    const query = statsQuerySchema.parse(request.query);

    if (query.tenantId && query.tenantId !== params.tenant) {
      throw new AppError("BAD_REQUEST", "tenantId query must match path tenant");
    }

    requirePartnerForTenant(request, params.tenant);
    return getOfferStats({
      tenantPublicId: params.tenant,
      ...(query.startDate ? { startDate: query.startDate } : {}),
      ...(query.endDate ? { endDate: query.endDate } : {}),
      ...(query.offerId ? { offerId: query.offerId } : {}),
    });
  });
}
