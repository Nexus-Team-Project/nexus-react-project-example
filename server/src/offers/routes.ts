// routes/offers.ts
import { Router, Request, Response, NextFunction } from "express";
import {
  validateOfferRequest,
  validateStatsRequest,
  validateUserOffersStatusRequest,
  validateCreateOfferRequest,
  validateAdoptVariantRequest,
  validateBulkCreateOffersRequest,
} from "../offers/validation";
import {
  getTenantAvailableOffers,
  getTenantUsedOffers,
  getOfferDetails,
  getOffersStats,
  getUserPurchasedOffersStatus,
  adoptOfferVariant,
} from "./repository";
import { createBulkOffers, createOffer } from "./service";
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
          title: purchase.offer?.title ?? "",
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
      variants: offer.variants.map((offerVariant) => ({
        variantId: offerVariant.id,
        images: offerVariant.images,
        combination: offerVariant.combination,
        summary: offerVariant.summary,
        terms: offerVariant.terms,
        price: Number(offerVariant.price),
        stock_quantity: offerVariant.stock_quantity,
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
  "/adopt-variant",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = validateAdoptVariantRequest(req);
      const tenantOffer = await adoptOfferVariant(data);

      logger.info("POST /adopt-variant succeeded", {
        tenantOfferID: tenantOffer.id,
        variantId: tenantOffer.variant_id,
        tenantId: tenantOffer.tenant_id,
      });

      res.status(201).json({
        tenantOfferId: tenantOffer.id,
        tenantId: tenantOffer.tenant_id,
        offerId: tenantOffer.offer_id,
        variantId: tenantOffer.variant_id,
        tenantDelta: Number(tenantOffer.tenant_delta),
        isActive: tenantOffer.is_active,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/create-offer",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = validateCreateOfferRequest(req);
      const { offer, variants, voucherAdmins, voucherCodes } = await createOffer(data);

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
          combination: v.combination,
          isActive: v.isActive,
        })),
        ...(voucherAdmins && {
          voucherAdmins: voucherAdmins.map((va) => ({
            id: va.id,
            variantId: va.variant_id,
            batchId: va.batch_id,
            purchaseValue: Number(va.purchase_value),
            costPrice: Number(va.cost_price),
          })),
        }),
        ...(voucherCodes && {
          voucherCodes: voucherCodes.map((vc) => ({
            id: vc.id,
            variantId: vc.variant_id,
            batchId: vc.batch_id,
            barcode: vc.barcode,
            status: vc.status,
          })),
        }),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/create-offer/bulk",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = validateBulkCreateOffersRequest(req);
      const { batchId, results } = await createBulkOffers(data);

      logger.info("POST /create-offer/bulk succeeded", {
        batchId,
        offerCount: results.length,
      });

      res.status(201).json({
        batchId,
        offers: results.map(({ offer, variants, voucherAdmins, voucherCodes }) => ({
          offerId: offer.id,
          title: offer.title,
          type: offer.type,
          status: offer.status,
          variants: variants.map((v) => ({
            variantId: v.id,
            sku: v.sku,
            combination: v.combination,
            isActive: v.isActive,
          })),
          ...(voucherAdmins && {
            voucherAdmins: voucherAdmins.map((va) => ({
              id: va.id,
              variantId: va.variant_id,
              batchId: va.batch_id,
              purchaseValue: Number(va.purchase_value),
              costPrice: Number(va.cost_price),
            })),
          }),
          ...(voucherCodes && {
            voucherCodes: voucherCodes.map((vc) => ({
              id: vc.id,
              variantId: vc.variant_id,
              batchId: vc.batch_id,
              barcode: vc.barcode,
              status: vc.status,
            })),
          }),
        })),
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
