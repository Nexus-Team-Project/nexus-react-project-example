/** This file registers simple test endpoints used by PayMe sandbox redirects. */
import type { FastifyInstance } from "fastify";

/** Adds local success and failure redirect endpoints for hosted payment testing. */
export async function registerTestRoutes(app: FastifyInstance): Promise<void> {
  app.get("/test/payment/success", async () => ({
    status: "success",
    message: "PayMe redirected to the local success endpoint",
  }));

  app.get("/test/payment/failure", async () => ({
    status: "failure",
    message: "PayMe redirected to the local failure endpoint",
  }));
}
