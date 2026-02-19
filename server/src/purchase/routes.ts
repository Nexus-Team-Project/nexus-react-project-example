// routes/offers.ts
import { Router, Request, Response } from "express";
import { validatePurchaseRequest } from "./validation";
import { createPurchase } from "./routesLogic";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { error, data } = validatePurchaseRequest(req);
    if (error) {
      return res.status(error.status).json({
        error: error.message,
        details: error.details,
      });
    }

    const paymentSessionUrl = await createPurchase(data);
    res.json({ paymentSessionUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create purchase" });
  }
});
