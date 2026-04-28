// routes/offers.ts
import { Router, Request, Response, NextFunction } from "express";
import {
  validateStatsRequest,
  validateCreateOfferRequest,
  validateAdoptVariantRequest,
  validateBulkCreateOffersRequest,
} from "../offers/validation";
import {
  getTenantAvailableOffers,
  getOfferDetails,
  getOffersStats,
  getUserPurchasedOffersStatus,
  adoptOfferVariant,
} from "./repository";
import { createBulkOffers, createOffer } from "./service";
import logger from "../logger";

const router = Router();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /offers/status/:tenant
router.get("/status/:tenant", async (req: Request, res: Response) => {
  try {
    const params = validateStatsRequest(req);
    const stats = await getOffersStats(params);
    logger.info("Fetched offer statistics", {
      tenantId: params.tenantId,
      count: stats.length,
    });
    res.json({ stats });
  } catch (error) {
    logger.error("Failed to fetch offer statistics", { error });
    res.status(500).json({ error: "Failed to fetch offer statistics" });
  }
});

// GET /offers/status/:tenant/:userEmail
router.get("/status/:tenant/:userEmail", async (req: Request, res: Response) => {
  const { tenant, userEmail } = req.params;
  try {
    const purchases = await getUserPurchasedOffersStatus(tenant, userEmail);
    const now = new Date();

    const purchasedOffers = purchases.map((purchase) => {
      const offerType = purchase.offer?.type;
      let status: "active" | "expired" = "active";

      if (offerType === "Voucher") {
        status = purchase.expiration_date && purchase.expiration_date < now ? "expired" : "active";
      } else if (offerType === "Coupon") {
        status = purchase.offer?.expiration_date && purchase.offer.expiration_date < now ? "expired" : "active";
      }

      return {
        offerId: purchase.offer_id,
        title: purchase.offer?.title ?? "",
        purchaseDate: purchase.created_at.toISOString(),
        expiryDate: purchase.expiration_date?.toISOString() ?? null,
        status,
        amount: Number(purchase.amount),
      };
    });

    logger.info("Fetched user purchased offers status", { tenant, userEmail, count: purchasedOffers.length });
    res.json({ purchasedOffers });
  } catch (error) {
    logger.error("Failed to fetch user purchased offers status", { error });
    res.status(500).json({ error: "Failed to fetch purchased offers status" });
  }
});


// GET /offers/:id
// If :id is a UUID → return offer details (GET /offers/{offerId})
// If :id is a string (tenant external ID) → return tenant's offer list (GET /offers/{tenantId})
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { page, pageSize, category } = req.query as Record<string, string>;

  if (UUID_REGEX.test(id)) {
    // ── Offer detail ────────────────────────────────────────────────────────
    try {
      const offer = await getOfferDetails(id);

      if (!offer) {
        logger.warn("Offer not found", { offerId: id });
        return res.status(404).json({ error: "Offer not found" });
      }

      res.json({
        offerId: offer.id,
        subOffers: offer.variants.map((v) => ({
          subOfferId: v.id,
          images: v.images,
          title: offer.title,
          summary: v.summary ?? offer.subtitle ?? "",
          terms: v.terms ?? "",
          costOptions: [
            {
              type: "fixed",
              cost: Number(v.price),
              available: v.stock_quantity,
            },
          ],
        })),
      });

      logger.info("Fetched offer details", {
        offerId: id,
        variantCount: offer.variants.length,
      });
    } catch (error) {
      logger.error("Failed to fetch offer details", { error, offerId: id });
      res.status(500).json({ error: "Failed to fetch offer details" });
    }
  } else {
    // ── Tenant offer list ────────────────────────────────────────────────────
    try {
      const offers = await getTenantAvailableOffers(
        id,
        category,
        page ? Number(page) : undefined,
        pageSize ? Number(pageSize) : undefined,
      );

      logger.info("Fetched tenant available offers", {
        tenantId: id,
        count: offers.length,
      });

      res.json({
        offers: offers.map((o) => ({
          offerId: o.id,
          image: o.images ?? "",
          title: o.title,
          summary: o.subtitle ?? "",
          price: o.variants.length > 0 ? Number(o.variants[0].price) : 0,
        })),
      });
    } catch (error) {
      logger.error("Failed to fetch tenant available offers", {
        error,
        tenantId: id,
      });
      res.status(500).json({ error: "Failed to fetch offers" });
    }
  }
});

// ── Internal / admin routes (not in public docs) ─────────────────────────────

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
      const { offer, variants, voucherAdmins, voucherCodes } =
        await createOffer(data);

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
