// routes/offers.ts
import { Router, Request, Response } from "express";
import { validateOfferRequest } from "../offers/validation";
import {
  getTenantUsedOffers,
  getTenantAvailableOffers,
} from "../offers/routesLogic";

const router = Router();

router.get(
  "/getTenantUsedOffers/:tenantId",
  async (req: Request, res: Response) => {
    try {
      const { error, data } = validateOfferRequest(req);
      if (error) {
        return res.status(error.status).json({
          error: error.message,
          details: error.details,
        });
      }

      const tenantUsedOffers = await getTenantUsedOffers(
        data.tenantId,
        data.category,
        data.page,
        data.pageSize,
      );

      res.json(tenantUsedOffers);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch offers" });
    }
  },
);

router.get(
  "/getTenantAvailableOffers/:tenantId",
  async (req: Request, res: Response) => {
    try {
      const { error, data } = validateOfferRequest(req);
      if (error) {
        return res.status(error.status).json({
          error: error.message,
          details: error.details,
        });
      }
      const availableOffers = await getTenantAvailableOffers(
        data.tenantId,
        data.category,
        data.page,
        data.pageSize,
      );
      res.json(availableOffers);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch offers" });
    }
  },
);

export default router;
