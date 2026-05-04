/** This file registers tenant aggregate offer statistics routes. */
import type { FastifyInstance } from "fastify";
import { AppError } from "../../shared/errors.js";
import { env } from "../../config/env.js";
import { requireAuth, requirePartnerForTenant } from "../auth/auth.middleware.js";
import { statsParamsSchema, statsQuerySchema } from "./stats.schemas.js";
import { getOfferStats } from "./stats.service.js";

/** Adds GET /offers/stats/:tenant for paid purchase statistics. */
export async function registerStatsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/offers/stats/:tenant", { preHandler: requireAuth }, async (request) => {
    const params = statsParamsSchema.parse(request.params);
    const query = statsQuerySchema.parse(request.query);

    // Documentation "Try it Out" mock interceptor
    if (request.headers.authorization === `Bearer ${env.DEMO_PARTNER_TOKEN}`) {
      return {
        tenantId: params.tenant,
        stats: [
          {
            offerId: "offer_98765",
            title: "Digital Gift Card (Demo)",
            totalPurchases: 150,
            totalRevenue: 15000
          },
          {
            offerId: "offer_54321",
            title: "Online Shopping Voucher (Demo)",
            totalPurchases: 85,
            totalRevenue: 4250
          }
        ],
        totalUsers: 235,
        totalTransactions: 235
      };
    }

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
