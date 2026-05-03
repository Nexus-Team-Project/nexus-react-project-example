/** This file registers login and logout routes for demo partner and user sessions. */
import type { FastifyInstance } from "fastify";
import { AppError } from "../../shared/errors.js";
import { requireAuth } from "./auth.middleware.js";
import { loginRequestSchema } from "./auth.schemas.js";
import { login, logout } from "./auth.service.js";

/** Adds POST /auth/login and POST /auth/logout for bearer-token sessions. */
export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post("/auth/login", async (request) => {
    const body = loginRequestSchema.parse(request.body);
    return login(body);
  });

  app.post("/auth/logout", { preHandler: requireAuth }, async (request) => {
    if (!request.auth?.tokenId) {
      throw new AppError("UNAUTHORIZED", "Bearer token is required");
    }

    return logout(request.auth.tokenId);
  });
}
