// routes/offers.ts
import { Router, Request, Response } from "express";
import { validateOfferRequest, validateStatsRequest } from "../offers/validation";
import { getTenantAvailableOffers, getTenantUsedOffers, getOfferDetails, getOffersStats } from "./repository";
import logger from "../logger";

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

      logger.info("Fetched tenant used offers", { tenantId: data.tenantId, count: tenantUsedOffers.length });
      res.json(tenantUsedOffers);
    } catch (error) {
      logger.error("Failed to fetch tenant used offers", { error, tenantId: req.params.tenantId });
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
      logger.info("Fetched tenant available offers", { tenantId: data.tenantId, count: availableOffers.length });
      res.json(availableOffers);
    } catch (error) {
      logger.error("Failed to fetch tenant available offers", { error, tenantId: req.params.tenantId });
      res.status(500).json({ error: "Failed to fetch offers" });
    }
  },
);

router.get("/status/:tenantId", async (req: Request, res: Response) => {
  try {
    const params = validateStatsRequest(req);
    const stats = await getOffersStats(params);
    logger.info("Fetched offer statistics", { tenantId: req.params.tenantId, count: stats.length });
    res.json({ stats });
  } catch (error) {
    logger.error("Failed to fetch offer statistics", { error, tenantId: req.params.tenantId });
    res.status(500).json({ error: "Failed to fetch offer statistics" });
  }
});

router.get("/:offerId", async (req: Request, res: Response) => {
  try {
    const { offerId } = req.params;
    const offer = await getOfferDetails(offerId);

    if (!offer) {
      logger.warn("Offer not found", { offerId });
      return res.status(404).json({ error: "Offer not found" });
    }

    const result = {
      offerId: offer.id,
      subOffers: offer.subOffers.map((sub) => ({
        subOfferId: sub.id,
        images: sub.images,
        title: sub.title,
        summary: sub.summary,
        terms: sub.terms,
        costOptions: sub.costOptions,
      })),
    };
    logger.info("Fetched offer details", { offerId, subOfferCount: result.subOffers.length });
    res.json(result);
  } catch (error) {
    logger.error("Failed to fetch offer details", { error, offerId: req.params.offerId });
    res.status(500).json({ error: "Failed to fetch offer details" });
  }
});

export default router;
