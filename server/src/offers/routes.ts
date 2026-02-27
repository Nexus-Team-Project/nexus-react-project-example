// routes/offers.ts
import { Router, Request, Response, NextFunction } from "express";
import {
  validateOfferRequest,
  validateStatsRequest,
  validateUserOffersStatusRequest,
  validateCreateOfferRequest,
} from "../offers/validation";
import {
  getTenantAvailableOffers,
  getTenantUsedOffers,
  getOfferDetails,
  getOffersStats,
  getUserPurchasedOffersStatus,
} from "./repository";
import { createOffer } from "./service";
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

      logger.info("Fetched tenant used offers", {
        tenantId: data.tenantId,
        count: tenantUsedOffers.length,
      });
      res.json(tenantUsedOffers);
    } catch (error) {
      logger.error("Failed to fetch tenant used offers", {
        error,
        tenantId: req.params.tenantId,
      });
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
      logger.info("Fetched tenant available offers", {
        tenantId: data.tenantId,
        count: availableOffers.length,
      });
      res.json(availableOffers);
    } catch (error) {
      logger.error("Failed to fetch tenant available offers", {
        error,
        tenantId: req.params.tenantId,
      });
      res.status(500).json({ error: "Failed to fetch offers" });
    }
  },
);

router.get("/status/:tenantId", async (req: Request, res: Response) => {
  try {
    const params = validateStatsRequest(req);
    const stats = await getOffersStats(params);
    logger.info("Fetched offer statistics", {
      tenantId: req.params.tenantId,
      count: stats.length,
    });
    res.json({ stats });
  } catch (error) {
    logger.error("Failed to fetch offer statistics", {
      error,
      tenantId: req.params.tenantId,
    });
    res.status(500).json({ error: "Failed to fetch offer statistics" });
  }
});

router.get(
  "/status/:tenant/:userEmail",
  async (req: Request, res: Response) => {
    try {
      const { tenant, userEmail } = validateUserOffersStatusRequest(req);
      const purchases = await getUserPurchasedOffersStatus(tenant, userEmail);
      const now = new Date();

      const purchasedOffers = purchases.map((purchase) => {
        const offerType = purchase.offer?.type;
        let status: "active" | "expired" = "active";

        if (offerType === "Voucher") {
          status =
            purchase.expiration_date && purchase.expiration_date < now
              ? "expired"
              : "active";
        } else if (offerType === "Coupon") {
          status =
            purchase.offer?.expiration_date &&
            purchase.offer.expiration_date < now
              ? "expired"
              : "active";
        }

        return {
          offerVariantId: purchase.offer_variant_id,
          offerId: purchase.offer_id,
          title: purchase.offerVariant?.title ?? purchase.offer?.title ?? "",
          purchaseDate: purchase.created_at.toISOString(),
          expiryDate: purchase.expiration_date?.toISOString() ?? null,
          status,
          amount: Number(purchase.amount),
        };
      });

      logger.info("Fetched user purchased offers status", {
        tenant,
        userEmail,
        count: purchasedOffers.length,
      });
      res.json({ purchasedOffers });
    } catch (error) {
      logger.error("Failed to fetch user purchased offers status", {
        error,
        tenant: req.params.tenant,
        userEmail: req.params.userEmail,
      });
      res
        .status(500)
        .json({ error: "Failed to fetch purchased offers status" });
    }
  },
);

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
      variants: offer.OfferVariants.map((offerVariant) => ({
        variantId: offerVariant.id,
        images: offerVariant.images,
        title: offerVariant.title,
        summary: offerVariant.summary,
        terms: offerVariant.terms,
      })),
    };
    logger.info("Fetched offer details", {
      offerId,
      variantCount: result.variants.length,
    });
    res.json(result);
  } catch (error) {
    logger.error("Failed to fetch offer details", {
      error,
      offerId: req.params.offerId,
    });
    res.status(500).json({ error: "Failed to fetch offer details" });
  }
});

router.post(
  "/create-offer",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = validateCreateOfferRequest(req);
      const { offer, variants } = await createOffer(data);

      logger.info("POST /create-offer succeeded", {
        offerId: offer.id,
        variantCount: variants.length,
      });

      res.status(201).json({
        offerId: offer.id,
        title: offer.title,
        type: offer.type,
        status: offer.status,
        variants: variants.map((v) => ({
          variantId: v.id,
          sku: v.sku,
          price: Number(v.price),
          stock_quantity: v.stock_quantity,
          title: v.title ?? null,
          isActive: v.isActive,
        })),
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
