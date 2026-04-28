/** This file registers simple test endpoints used by PayMe sandbox redirects. */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../../shared/errors.js";
import { applyPaymentEvent } from "../payments/payme.webhook.js";
import type { ParsedPaymentEvent } from "../payments/payment-provider.js";

const payMeSuccessQuerySchema = z.object({
  payme_status: z.string().optional(),
  payme_sale_id: z.string().optional(),
  payme_transaction_id: z.string().optional(),
  price: z.coerce.number().int().positive().optional(),
  currency: z.string().length(3).optional(),
  transaction_id: z.string().uuid().optional(),
});

/** Adds local success and failure redirect endpoints for hosted payment testing. */
export async function registerTestRoutes(app: FastifyInstance): Promise<void> {
  app.get("/test/payment/success", async (request) => {
    const query = payMeSuccessQuerySchema.parse(request.query);

    if (query.payme_status === "success" && query.transaction_id && query.price && query.currency) {
      const event: ParsedPaymentEvent = {
        purchaseId: query.transaction_id,
        amount: convertAgorotToIls(query.price),
        currency: query.currency,
        status: "paid",
        rawPayload: query,
        ...(query.payme_sale_id ? { providerSaleId: query.payme_sale_id } : {}),
      };

      const eventId = query.payme_transaction_id ?? query.payme_sale_id;
      if (eventId) {
        event.eventId = eventId;
      }

      await applyPaymentEvent(event);
    }

    return {
      status: "success",
      message: "PayMe redirected to the local success endpoint",
    };
  });

  app.get("/test/payment/failure", async () => ({
    status: "failure",
    message: "PayMe redirected to the local failure endpoint",
  }));
}

/** Converts PayMe agorot back to an ILS amount string for payment matching. */
function convertAgorotToIls(price: number): string {
  if (!Number.isInteger(price) || price <= 0) {
    throw new AppError("BAD_REQUEST", "PayMe price must be a positive agorot integer");
  }

  return (price / 100).toFixed(2);
}
