import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ─── Fixed IDs (idempotent — safe to run multiple times) ────────────────────

const IDS = {
  merchant:  "10000000-0000-0000-0000-000000000001",
  tenant:    "20000000-0000-0000-0000-000000000001",
  user:      "30000000-0000-0000-0000-000000000001",

  // Offers
  offer_gift100:      "a0000000-0000-0000-0000-000000000001",
  offer_gift250:      "a0000000-0000-0000-0000-000000000002",
  offer_coupon20:     "a0000000-0000-0000-0000-000000000003",

  // Variants
  variant_gift100:    "b0000000-0000-0000-0000-000000000001",
  variant_gift250:    "b0000000-0000-0000-0000-000000000002",
  variant_coupon20:   "b0000000-0000-0000-0000-000000000003",

  // TenantOffers
  tenantOffer_gift100:   "c0000000-0000-0000-0000-000000000001",
  tenantOffer_gift250:   "c0000000-0000-0000-0000-000000000002",
  tenantOffer_coupon20:  "c0000000-0000-0000-0000-000000000003",

  // VoucherAdmin batch
  batch_gift100: "d0000000-0000-0000-0000-000000000001",
  batch_gift250: "d0000000-0000-0000-0000-000000000002",
};

async function main() {
  console.log("🌱  Seeding database...\n");

  // ── Merchant: Nexus ───────────────────────────────────────────────────────
  const merchant = await prisma.merchant.upsert({
    where: { id: IDS.merchant },
    update: {},
    create: {
      id: IDS.merchant,
      business_name: "Nexus",
      contact_name: "Nexus Admin",
      email: "admin@nexus.com",
      phone: "0501234567",
      business_registration_number: "515123456",
      business_type: "LLC",
      bank_name: "Bank Hapoalim",
      bank_branch: "001",
      bank_account: "123456",
      bank_account_holder: "Nexus Ltd",
      commission_rate: 10,
      status: "active",
    },
  });
  console.log(`✅  Merchant: ${merchant.business_name} (${merchant.id})`);

  // ── Tenant: DigiProduct ──────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { id: IDS.tenant },
    update: {},
    create: {
      id: IDS.tenant,
      tenant_id: "digiproduct",
      name: "DigiProduct",
      title: "DigiProduct Benefits Portal",
      status: "active",
      email: "contact@digiproduct.co.il",
      phone: "0521234567",
    },
  });
  console.log(`✅  Tenant: ${tenant.name} (tenant_id: "${tenant.tenant_id}")`);

  // ── User ──────────────────────────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { id: IDS.user },
    update: {},
    create: {
      id: IDS.user,
      name: "Test User",
      email: "test@digiproduct.co.il",
      phone: "0541234567",
      tenant_id: IDS.tenant,
    },
  });
  console.log(`✅  User: ${user.name} (${user.email})`);

  // ── Offer 1: Gift Card ₪100 (Voucher) ────────────────────────────────────
  await prisma.merchantsOffers.upsert({
    where: { id: IDS.offer_gift100 },
    update: {},
    create: {
      id: IDS.offer_gift100,
      merchant_id: IDS.merchant,
      title: "Amazon Gift Card ₪100",
      subtitle: "Buy products on Amazon with a ₪100 gift card",
      type: "Voucher",
      status: "active",
      category: "shopping",
      time_limit: 365,
    },
  });

  await prisma.offerVariant.upsert({
    where: { id: IDS.variant_gift100 },
    update: {},
    create: {
      id: IDS.variant_gift100,
      offer_id: IDS.offer_gift100,
      sku: "GIFT-100-V1",
      price: 80,
      value: 100,
      cost: 75,
      stock_quantity: 50,
      combination: {},
      summary: "Valid for 12 months. Delivered by email.",
      terms: "Non-refundable. Cannot be exchanged for cash.",
      isActive: true,
    },
  });

  await prisma.voucherAdmin.upsert({
    where: { variant_id: IDS.variant_gift100 },
    update: {},
    create: {
      variant_id: IDS.variant_gift100,
      batch_id: IDS.batch_gift100,
      purchase_value: 100,
      cost_price: 75,
    },
  });

  // Seed 10 voucher codes for gift100
  for (let i = 1; i <= 10; i++) {
    const code = `GIFT100-${String(i).padStart(3, "0")}`;
    const codeId = `e0000000-0001-0000-0000-${String(i).padStart(12, "0")}`;
    await prisma.voucherCode.upsert({
      where: { id: codeId },
      update: {},
      create: {
        id: codeId,
        variant_id: IDS.variant_gift100,
        sku: "GIFT-100-V1",
        batch_id: IDS.batch_gift100,
        barcode: code,
        status: "available",
      },
    });
  }
  console.log("✅  Offer: Amazon Gift Card ₪100 (10 codes)");

  // ── Offer 2: Gift Card ₪250 (Voucher) ────────────────────────────────────
  await prisma.merchantsOffers.upsert({
    where: { id: IDS.offer_gift250 },
    update: {},
    create: {
      id: IDS.offer_gift250,
      merchant_id: IDS.merchant,
      title: "Amazon Gift Card ₪250",
      subtitle: "Buy products on Amazon with a ₪250 gift card",
      type: "Voucher",
      status: "active",
      category: "shopping",
      time_limit: 365,
    },
  });

  await prisma.offerVariant.upsert({
    where: { id: IDS.variant_gift250 },
    update: {},
    create: {
      id: IDS.variant_gift250,
      offer_id: IDS.offer_gift250,
      sku: "GIFT-250-V1",
      price: 200,
      value: 250,
      cost: 190,
      stock_quantity: 30,
      combination: {},
      summary: "Valid for 12 months. Delivered by email.",
      terms: "Non-refundable. Cannot be exchanged for cash.",
      isActive: true,
    },
  });

  await prisma.voucherAdmin.upsert({
    where: { variant_id: IDS.variant_gift250 },
    update: {},
    create: {
      variant_id: IDS.variant_gift250,
      batch_id: IDS.batch_gift250,
      purchase_value: 250,
      cost_price: 190,
    },
  });

  for (let i = 1; i <= 10; i++) {
    const code = `GIFT250-${String(i).padStart(3, "0")}`;
    const codeId = `e0000000-0002-0000-0000-${String(i).padStart(12, "0")}`;
    await prisma.voucherCode.upsert({
      where: { id: codeId },
      update: {},
      create: {
        id: codeId,
        variant_id: IDS.variant_gift250,
        sku: "GIFT-250-V1",
        batch_id: IDS.batch_gift250,
        barcode: code,
        status: "available",
      },
    });
  }
  console.log("✅  Offer: Amazon Gift Card ₪250 (10 codes)");

  // ── Offer 3: 20% Discount Coupon ─────────────────────────────────────────
  const couponExpiry = new Date();
  couponExpiry.setMonth(couponExpiry.getMonth() + 6);

  await prisma.merchantsOffers.upsert({
    where: { id: IDS.offer_coupon20 },
    update: {},
    create: {
      id: IDS.offer_coupon20,
      merchant_id: IDS.merchant,
      title: "20% Off Coupon",
      subtitle: "Get 20% off your next online purchase",
      type: "Coupon",
      status: "active",
      category: "discount",
      expiration_date: couponExpiry,
    },
  });

  await prisma.offerVariant.upsert({
    where: { id: IDS.variant_coupon20 },
    update: {},
    create: {
      id: IDS.variant_coupon20,
      offer_id: IDS.offer_coupon20,
      sku: "COUPON-20-V1",
      price: 30,
      value: 30,
      cost: 20,
      stock_quantity: 100,
      combination: {},
      summary: "Valid for 6 months from purchase date.",
      terms: "One use per customer. Cannot be combined with other offers.",
      isActive: true,
    },
  });
  console.log("✅  Offer: 20% Off Coupon");

  // ── TenantOffers: DigiProduct adopts all 3 variants ─────────────────────
  const adoptions = [
    { id: IDS.tenantOffer_gift100,  variantId: IDS.variant_gift100,  offerId: IDS.offer_gift100 },
    { id: IDS.tenantOffer_gift250,  variantId: IDS.variant_gift250,  offerId: IDS.offer_gift250 },
    { id: IDS.tenantOffer_coupon20, variantId: IDS.variant_coupon20, offerId: IDS.offer_coupon20 },
  ];

  for (const a of adoptions) {
    await prisma.tenantOffer.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id,
        tenant_id: IDS.tenant,
        offer_id: a.offerId,
        variant_id: a.variantId,
        tenant_delta: 0,
        is_active: true,
      },
    });
  }
  console.log("✅  TenantOffers: DigiProduct adopted all 3 offers");

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅  Seed complete

  Merchant:   Nexus
  Tenant:     DigiProduct  →  tenant_id: "digiproduct"
  Test User:  test@digiproduct.co.il
  Token:      Bearer token-test
  Offers:     Amazon Gift Card ₪100, ₪250 | 20% Coupon

  Quick test:
    GET  /offers/digiproduct
    GET  /offers/${IDS.offer_gift100}
    POST /purchase  { tenantId:"digiproduct", offerVariantId:"${IDS.variant_gift100}", ... }
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main()
  .catch((e) => {
    console.error("❌  Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
