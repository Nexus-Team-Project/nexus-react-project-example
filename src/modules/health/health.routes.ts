/** This file registers health and readiness endpoints for local testing. */
import type { FastifyInstance } from "fastify";
// no DB readiness check required; keep health simple

/** Adds /health route to the Fastify app. */
export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => ({ status: "ok" }));
}
