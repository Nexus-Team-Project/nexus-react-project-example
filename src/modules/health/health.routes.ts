/** This file registers health and readiness endpoints for local testing. */
import type { FastifyInstance } from "fastify";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../shared/errors.js";

/** Adds /health and /ready routes to the Fastify app. */
export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => ({ status: "ok" }));

  app.get("/ready", async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: "ready" };
    } catch {
      throw new AppError("INTERNAL_ERROR", "Database is not ready");
    }
  });
}
