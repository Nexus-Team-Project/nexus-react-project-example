import { Router, Request, Response, NextFunction } from "express";
import { validatePurchaseRequest } from "./validation";
import { createPurchase } from "./service";

const router = Router();

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = validatePurchaseRequest(req);
    const paymeResponse = await createPurchase(data);
    res.json(paymeResponse);
  } catch (error) {
    next(error);
  }
});

export default router;
