/** This file starts the HTTP server for the Nexus test backend. */
import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { disconnectPrisma } from "./db/prisma.js";
import { startExpiredPurchaseCleanupJob } from "./modules/purchases/purchases.cleanup.js";

/** Starts Fastify and installs graceful shutdown hooks. */
async function startServer(): Promise<void> {
  const app = await buildApp();
  const expiredPurchaseCleanup = startExpiredPurchaseCleanupJob({
    logError: (error, message) => {
      app.log.error({ error }, message);
    },
    logInfo: (data, message) => {
      app.log.info(data, message);
    },
  });

  const close = async () => {
    expiredPurchaseCleanup.stop();
    await app.close();
    await disconnectPrisma();
  };

  process.on("SIGINT", () => {
    void close().finally(() => process.exit(0));
  });

  process.on("SIGTERM", () => {
    void close().finally(() => process.exit(0));
  });

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
}

void startServer();
