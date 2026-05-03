# Nexus Benefits API Test Backend

This project is a server-only Node.js TypeScript backend for the DigiProduct Nexus Benefits API test flow. It uses Fastify, PostgreSQL, Prisma, and Zod.

## Local Setup

1. Copy `.env.example` to `.env` and replace placeholders with local values.
2. Start PostgreSQL with `docker compose up -d postgres`.
3. Install dependencies with `npm install`.
4. Generate Prisma client with `npm run prisma:generate`.
5. Run migrations with `npm run prisma:migrate`.
6. Seed DigiProduct data with `npm run prisma:seed`.
7. Start the server with `npm run dev`.

## Seeded Test Data

The seed script creates tenant `digiproduct`, test user `user@example.com`, two vouchers, two coupons, one custom gift card, a partner JWT, and a user JWT.

Run:

```bash
npm run prisma:seed
```

Copy the printed `Partner bearer token` for offer and purchase calls. Copy the printed `User bearer token` for user status calls.

## Manual API Flow

Start the database:

```bash
docker compose up -d postgres
```

Install and prepare the server:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

For real PayMe sandbox calls, PayMe must be able to reach your return and callback URLs. `localhost` will be rejected. Use a public HTTPS tunnel, for example:

```bash
ngrok http 3000
```

Then update `.env` with the HTTPS URL from ngrok:

```env
PUBLIC_API_BASE_URL=https://YOUR-NGROK-DOMAIN.ngrok-free.app
PAYMENT_SUCCESS_URL=https://YOUR-NGROK-DOMAIN.ngrok-free.app/test/payment/success
PAYMENT_FAILURE_URL=https://YOUR-NGROK-DOMAIN.ngrok-free.app/test/payment/failure
```

Restart `npm run dev` after changing `.env`.

List DigiProduct offers:

```bash
curl -H "Authorization: Bearer YOUR_PARTNER_TOKEN" http://localhost:3000/offers/digiproduct
```

Get offer details:

```bash
curl -H "Authorization: Bearer YOUR_PARTNER_TOKEN" http://localhost:3000/offers/offer_digital_voucher
```

Create a purchase for the seeded user:

```bash
curl -X POST http://localhost:3000/purchase \
  -H "Authorization: Bearer YOUR_PARTNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "digiproduct",
    "offerId": "offer_digital_voucher",
    "email": "user@example.com",
    "amount": 199,
    "buyer_name": "Test User",
    "buyer_email": "user@example.com",
    "buyer_phone": "0501234567",
    "receiptDetails": {
      "fullName": "Test User",
      "email": "user@example.com",
      "phone": "0501234567",
      "notes": "Local test purchase"
    }
  }'
```

The response contains a mock `paymentSessionUrl` while `PAYME_BASE_URL=mock`.

Simulate a paid PayMe webhook by replacing `PURCHASE_DATABASE_ID` with the database `Purchase.id` created by the purchase call:

```bash
curl -X POST http://localhost:3000/webhooks/payme \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "evt_local_paid_1",
    "purchaseId": "PURCHASE_DATABASE_ID",
    "amount": "199.00",
    "currency": "ILS",
    "status": "paid"
  }'
```

Check user purchased offers:

```bash
curl -H "Authorization: Bearer YOUR_USER_TOKEN" http://localhost:3000/offers/status/digiproduct/user@example.com
```

Check tenant stats:

```bash
curl -H "Authorization: Bearer YOUR_PARTNER_TOKEN" http://localhost:3000/offers/status/digiproduct
```

## Implemented Server Flows

## Implemented Server Flows

- `GET /health`
- `GET /offers/digiproduct`
- `GET /offers/:offerId`
- `POST /purchase`
- `POST /webhooks/payme`
- `GET /offers/status/:tenant`
- `GET /offers/status/:tenant/:userEmail`

## PayMe Boundary

The PayMe adapter is isolated behind `PaymentProvider`. With `PAYME_BASE_URL=https://sandbox.payme.io/api/`, purchase creation calls:

```text
POST https://sandbox.payme.io/api/generate-sale
```

The adapter maps backend purchases to PayMe hosted payment page fields:

- `seller_payme_id`: `PAYME_SELLER_ID`
- `sale_price`: purchase amount converted to agorot, where 100 agorot is 1 ILS
- `currency`: purchase currency, currently `ILS`
- `product_name`: offer title
- `transaction_id`: internal purchase database ID
- `sale_callback_url`: `PUBLIC_API_BASE_URL` plus `/webhooks/payme`
- `sale_email`: buyer email
- `sale_return_url`: configured success URL
- `sale_mobile`: buyer phone
- `sale_name`: buyer name
- `sale_type`: `sale`
- `sale_payment_method`: `credit-card`

The adapter validates PayMe response fields including `status_code`, `sale_url`, `payme_sale_id`, `price`, `transaction_id`, `currency`, and optional `session`.

Set `PAYME_BASE_URL=mock` for local testing without calling PayMe. The mock provider returns a local checkout URL and stores the payment session.

Still confirm from PayMe before production use:

- whether `Authorization: Bearer PAYME_API_KEY` is required for this endpoint or the seller ID is enough
- callback payload fields and exact paid/failed status values
- callback signature header and algorithm
- idempotency support for duplicate `transaction_id`

For sandbox testing before PayMe signature details are confirmed, set:

```env
PAYME_REQUIRE_WEBHOOK_SIGNATURE=false
```

For real production payments, set it to `true` after the webhook signature format is implemented and verified.
