/** This file registers Nexus-compatible public offer routes. */
import type { FastifyInstance } from "fastify";
import { requireAccountForTenant, requireAuth } from "../auth/auth.middleware.js";
import { offerListQuerySchema, offerLookupParamsSchema } from "./offers.schemas.js";
import { resolveOfferRoute } from "./offers.service.js";
import { env } from "../../config/env.js";

interface DemoOffer {
  offerId: string;
  image: string;
  title: string;
  summary: string;
  price: number;
  category: string;
}

const demoOffers: DemoOffer[] = [
  {
    offerId: "offer_shop_100",
    image: "https://cdn.nexus.com/offers/offer_shop_100.jpg",
    title: "Shopping Gift Card (Demo)",
    summary: "Use this gift card across selected retail partner stores",
    price: 100,
    category: "shopping"
  },
  {
    offerId: "offer_shop_250",
    image: "https://cdn.nexus.com/offers/offer_shop_250.jpg",
    title: "Premium Shopping Voucher (Demo)",
    summary: "A higher-value retail voucher for online and in-store purchases",
    price: 250,
    category: "shopping"
  },
  {
    offerId: "offer_dining_75",
    image: "https://cdn.nexus.com/offers/offer_dining_75.jpg",
    title: "Restaurant Credit (Demo)",
    summary: "Redeem this benefit at participating cafes and restaurants",
    price: 75,
    category: "dining"
  },
  {
    offerId: "offer_dining_150",
    image: "https://cdn.nexus.com/offers/offer_dining_150.jpg",
    title: "Weekend Dining Voucher (Demo)",
    summary: "A dining benefit for weekend meals and special occasions",
    price: 150,
    category: "dining"
  },
  {
    offerId: "offer_wellness_120",
    image: "https://cdn.nexus.com/offers/offer_wellness_120.jpg",
    title: "Wellness Treatment (Demo)",
    summary: "Use this benefit for spa, fitness, or personal care services",
    price: 120,
    category: "wellness"
  },
  {
    offerId: "offer_wellness_300",
    image: "https://cdn.nexus.com/offers/offer_wellness_300.jpg",
    title: "Premium Wellness Package (Demo)",
    summary: "A larger wellness package for recurring health and fitness use",
    price: 300,
    category: "wellness"
  }
];

/** Returns filtered and paginated offer data for documentation Try it Out calls. */
function getDemoOfferList(query: { page: number; pageSize: number; category?: string | undefined }) {
  const filteredOffers = query.category ? demoOffers.filter((offer) => offer.category === query.category) : demoOffers;
  const startIndex = (query.page - 1) * query.pageSize;

  return {
    offers: filteredOffers.slice(startIndex, startIndex + query.pageSize).map(({ category: _category, ...offer }) => offer)
  };
}

/** Adds GET /offers/:id for tenant offer lists and offer details. */
export async function registerOfferRoutes(app: FastifyInstance): Promise<void> {
  app.get("/offers/:id", { preHandler: requireAuth }, async (request) => {
    const params = offerLookupParamsSchema.parse(request.params);
    const query = offerListQuerySchema.parse(request.query);

    // Documentation "Try it Out" mock interceptor
    if (request.headers.authorization === `Bearer ${env.DEMO_PARTNER_TOKEN}`) {
      if (params.id === "tenant_001") {
        return getDemoOfferList(query);
      }
      return {
        offerId: params.id,
        title: "Demo Offer Details",
        description: "This is a high-end demo offer for API testing purposes.",
        price: 250,
        currency: "ILS",
        image: "https://cdn.nexus.com/offers/demo.jpg",
        terms: "Demo terms and conditions apply."
      };
    }

    const routeInput = {
      id: params.id,
      page: query.page,
      pageSize: query.pageSize,
      assertTenantAccess: (tenantId: string) => requireAccountForTenant(request, tenantId),
      ...(query.category ? { category: query.category } : {}),
    };

    return resolveOfferRoute(routeInput);
  });
}
