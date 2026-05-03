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
  app.get("/test/payment/success", async (request, reply) => {
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

    return reply.type("text/html").send(getPaymentResultHtml("success", "Payment confirmed"));
  });

  app.get("/test/payment/failure", async (_request, reply) => reply.type("text/html").send(getPaymentResultHtml("failure", "Payment failed")));
}

/** Converts PayMe agorot back to an ILS amount string for payment matching. */
function convertAgorotToIls(price: number): string {
  if (!Number.isInteger(price) || price <= 0) {
    throw new AppError("BAD_REQUEST", "PayMe price must be a positive agorot integer");
  }

  return (price / 100).toFixed(2);
}

/** Builds an iframe-friendly payment result page that notifies the parent app. */
function getPaymentResultHtml(status: "success" | "failure", message: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${message}</title>
    <style>
      body{margin:0;display:grid;min-height:100vh;place-items:center;font-family:system-ui,sans-serif;background:#fffdf6;color:#191919}
      main{display:flex;flex-direction:column;align-items:center;gap:20px;text-align:center}
      strong{font-size:22px}
      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(0, 0, 0, 0.1);
        border-left-color: #191919;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  </head>
  <body>
    <main>
      <div class="spinner"></div>
      <strong>${message}</strong>
      <span>Returning to Nexus Demo...</span>
    </main>
    <script>window.parent.postMessage({ type: "nexus-payment-result", status: "${status}" }, "*");</script>
  </body>
</html>`;
}
