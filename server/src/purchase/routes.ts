import { Router, Request, Response, NextFunction } from "express";
import { validatePurchaseRequest } from "./validation";
import { createPurchase } from "./service";

const router = Router();

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = validatePurchaseRequest(req);
    const paymeResponse = await createPurchase(data);

    const saleUrl = new URL(paymeResponse.sale_url);
    if (data.buyer_name)  saleUrl.searchParams.set("buyer_name", data.buyer_name);
    if (data.buyer_email) saleUrl.searchParams.set("buyer_email", data.buyer_email);
    // buyer_phone intentionally omitted — triggers PayMe OTP verification flow

    res.json({ paymentSessionUrl: saleUrl.toString() });
  } catch (error) {
    next(error);
  }
});

export default router;
