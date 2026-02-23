import express from "express";
import tenantsRouter from "./tenants/routes";
import offersRouter from "./offers/routes";
import purchaseRouter from "./purchase/routes";
import { authMiddleware } from "./middlewares/authorization";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(authMiddleware);

// Routes
app.use("/tenants", tenantsRouter);
app.use("/offers", offersRouter);
app.use("/purchase", purchaseRouter);

// Global error handler — must be registered after all routes
app.use(errorHandler);

const server = app.listen(port, (error) => {
  if (error) {
    console.error("Failed to start server:", error);
  }
  console.log(`Server running at http://localhost:${port}`);
});
