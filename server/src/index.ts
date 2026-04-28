import express from "express";
import tenantsRouter from "./tenants/routes";
import offersRouter from "./offers/routes";
import purchaseRouter from "./purchase/routes";
import purchaseCallbackRouter from "./purchase/callbackRoutes";
import usersRouter from "./users/routes";
import { authMiddleware } from "./middlewares/authorization";
import { errorHandler } from "./middlewares/errorHandler";
import logger from "./logger";

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(express.json());

// Public routes — registered before authMiddleware so PayMe can POST without a Bearer token
app.use("/purchase/callback", purchaseCallbackRouter);

// Auth middleware — protects all routes below
app.use(authMiddleware);

// Protected routes
app.use("/tenants", tenantsRouter);
app.use("/offers", offersRouter);
app.use("/purchase", purchaseRouter);
app.use("/users", usersRouter);


// Global error handler — must be registered after all routes
app.use(errorHandler);

const server = app.listen(port, (error) => {
  if (error) {
    logger.error("Failed to start server", { error });
    return;
  }
  logger.info(`Server running at http://localhost:${port}`);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception — shutting down", { stack: err.stack, message: err.message });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", { reason });
  process.exit(1);
});
