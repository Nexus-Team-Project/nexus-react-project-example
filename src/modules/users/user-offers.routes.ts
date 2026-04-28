/** This file registers user purchased-offer status routes. */
import type { FastifyInstance } from "fastify";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors.js";
import { normalizeEmail } from "../../shared/strings.js";
import { requireAuth, requirePartnerForTenant, requireUserForEmail } from "../auth/auth.middleware.js";
import { userStatusParamsSchema } from "./user-offers.schemas.js";
import { getPurchasedOffersForUser } from "./user-offers.service.js";

/** Adds GET /offers/status/:tenant/:userEmail for user benefit status. */
export async function registerUserOfferRoutes(app: FastifyInstance): Promise<void> {
  app.get("/offers/status/:tenant/:userEmail", { preHandler: requireAuth }, async (request) => {
    const params = userStatusParamsSchema.parse(request.params);
    const email = normalizeEmail(params.userEmail);

    if (request.auth?.type === "PARTNER" && env.ALLOW_PARTNER_STATUS_READS && env.NODE_ENV !== "production") {
      requirePartnerForTenant(request, params.tenant);
      return getPurchasedOffersForUser(params.tenant, email);
    }

    if (request.auth?.type !== "USER") {
      throw new AppError("UNAUTHORIZED", "User bearer token is required");
    }

    requireUserForEmail(request, email);
    return getPurchasedOffersForUser(params.tenant, email);
  });
}
