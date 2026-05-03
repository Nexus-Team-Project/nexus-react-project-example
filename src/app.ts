/** This file builds the Fastify application and registers all API modules. */
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { env } from "./config/env.js";
import { AppError, sendApiError, toAppError } from "./shared/errors.js";
import { registerAuthRoutes } from "./modules/auth/auth.routes.js";
import { registerHealthRoutes } from "./modules/health/health.routes.js";
import { registerOfferRoutes } from "./modules/offers/offers.routes.js";
import { registerPayMeWebhookRoute } from "./modules/payments/payme.webhook.js";
import { registerPurchaseRoutes } from "./modules/purchases/purchases.routes.js";
import { registerStatsRoutes } from "./modules/stats/stats.routes.js";
import { registerTestRoutes } from "./modules/test/test.routes.js";
import { registerUserOfferRoutes } from "./modules/users/user-offers.routes.js";

/** Creates a configured Fastify app with security middleware and routes. */
export async function buildApp() {
  const app = Fastify({
    logger: {
      redact: ["req.headers.authorization", "headers.authorization", "*.PAYME_API_KEY"],
    },
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        "frame-ancestors": ["'self'", ...getAllowedOrigins()],
      },
    },
  });
  await app.register(cors, {
    origin: getAllowedOrigins(),
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
  });
  await app.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute",
  });

  app.setErrorHandler((error, _request, reply) => {
    const apiError = error instanceof AppError ? error : toAppError(error);
    if (apiError.statusCode >= 500) {
      app.log.error({ error }, "Request failed");
    }
    sendApiError(reply, apiError);
  });

  await registerHealthRoutes(app);
  await registerAuthRoutes(app);
  await registerTestRoutes(app);
  await registerPayMeWebhookRoute(app);
  await registerUserOfferRoutes(app);
  await registerStatsRoutes(app);
  await registerPurchaseRoutes(app);
  await registerOfferRoutes(app);

  return app;
}

/** Reads configured browser origins and keeps CORS restricted to known clients. */
function getAllowedOrigins(): string[] {
  return env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter((origin) => origin.length > 0);
}
