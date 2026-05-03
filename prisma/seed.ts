/** This seed script creates DigiProduct tenants, users, offers, and test tokens. */
import { PrismaClient } from "@prisma/client";
import { env } from "../src/config/env.js";
import { createOpaqueToken, sha256 } from "../src/shared/security.js";
import { signTestToken } from "../src/modules/auth/token.service.js";

const prisma = new PrismaClient();
const CLOUDINARY_OFFERS_BASE_URL = "https://res.cloudinary.com/dyqjvjdlq/image/upload/offers";

function offerImageUrl(fileName: string): string {
  return `${CLOUDINARY_OFFERS_BASE_URL}/${fileName}.png`;
}

function subOfferImageUrl(publicId: string): string {
  const fallbackOfferIdBySubOffer: Record<string, string> = {
    sub_digital_voucher_199: "offer_digital_voucher",
    sub_coupon_code_50: "offer_coupon_code",
    sub_premium_voucher_349: "offer_premium_voucher",
    sub_weekend_coupon_75: "offer_weekend_coupon",
  };

  const fallbackOfferId = fallbackOfferIdBySubOffer[publicId];

  if (fallbackOfferId) {
    return offerImageUrl(fallbackOfferId);
  }

  return `${CLOUDINARY_OFFERS_BASE_URL}/${publicId}.png`;
}

/** Seeds all local data needed for manual API verification. */
async function seed(): Promise<void> {
  const tenant = await prisma.tenant.upsert({
    where: { tenantId: "digiproduct" },
    update: { name: "DigiProduct", status: "ACTIVE" },
    create: { tenantId: "digiproduct", name: "DigiProduct", status: "ACTIVE" },
  });

  await prisma.user.upsert({
    where: { tenantId_emailNormalized: { tenantId: tenant.id, emailNormalized: "user@example.com" } },
    update: { status: "ACTIVE" },
    create: {
      tenantId: tenant.id,
      email: "user@example.com",
      emailNormalized: "user@example.com",
      fullName: "Test User",
      phone: "0501234567",
      status: "ACTIVE",
    },
  });

  await seedOffer({
    publicId: "offer_digital_voucher",
    category: "voucher",
    title: "Digital Gift Card",
    summary: "Use this gift card across multiple partner stores",
    imageUrl: offerImageUrl("offer_digital_voucher"),
    offerType: "VOUCHER",
    subOfferPublicId: "sub_digital_voucher_199",
    subTitle: "199 NIS Digital Voucher",
    cost: "199",
    available: 35,
    tenantId: tenant.id,
  });

  await seedOffer({
    publicId: "offer_coupon_code",
    category: "coupon",
    title: "Coupon Code",
    summary: "Redeem a one-time DigiProduct coupon code",
    imageUrl: offerImageUrl("offer_coupon_code"),
    offerType: "COUPON",
    subOfferPublicId: "sub_coupon_code_50",
    subTitle: "50 NIS Coupon",
    cost: "50",
    available: 100,
    tenantId: tenant.id,
  });

  await seedOffer({
    publicId: "offer_premium_voucher",
    category: "voucher",
    title: "Premium Shopping Voucher",
    summary: "A higher-value voucher for DigiProduct partner stores",
    imageUrl: offerImageUrl("offer_premium_voucher"),
    offerType: "VOUCHER",
    subOfferPublicId: "sub_premium_voucher_349",
    subTitle: "349 NIS Premium Voucher",
    cost: "349",
    available: 25,
    tenantId: tenant.id,
  });

  await seedOffer({
    publicId: "offer_weekend_coupon",
    category: "coupon",
    title: "Weekend Coupon",
    summary: "A limited coupon for weekend DigiProduct purchases",
    imageUrl: offerImageUrl("offer_weekend_coupon"),
    offerType: "COUPON",
    subOfferPublicId: "sub_weekend_coupon_75",
    subTitle: "75 NIS Weekend Coupon",
    cost: "75",
    available: 80,
    tenantId: tenant.id,
  });

  await seedCustomOffer(tenant.id);

  const partnerToken = signTestToken({ sub: "digiproduct-partner", type: "PARTNER", tenant: "digiproduct", scopes: ["offers:read", "purchase:create", "stats:read"] }, "30d");
  await prisma.apiToken.upsert({
    where: { tokenHash: sha256(partnerToken) },
    update: { revokedAt: null },
    create: {
      tokenHash: sha256(partnerToken),
      type: "PARTNER",
      tenantId: tenant.id,
      scopes: ["offers:read", "purchase:create", "stats:read"],
    },
  });

  const userToken = signTestToken({ sub: "user@example.com", type: "USER", tenant: "digiproduct", email: "user@example.com", scopes: ["status:read"] }, "7d");
  await prisma.apiToken.upsert({
    where: { tokenHash: sha256(userToken) },
    update: { revokedAt: null },
    create: {
      tokenHash: sha256(userToken),
      type: "USER",
      tenantId: tenant.id,
      userEmail: "user@example.com",
      userEmailNormalized: "user@example.com",
      scopes: ["status:read"],
    },
  });

  const unusedOpaqueToken = createOpaqueToken();
  console.log("Seed complete.");
  console.log(`Partner bearer token: ${partnerToken}`);
  console.log(`User bearer token: ${userToken}`);
  console.log(`Unused opaque token sample: ${unusedOpaqueToken}`);
  console.log(`Configured PARTNER_API_TOKEN_HASH length: ${env.PARTNER_API_TOKEN_HASH.length}`);
}

/** Seeds a fixed-price offer with one active sub-offer and one cost option. */
async function seedOffer(input: {
  publicId: string;
  category: string;
  title: string;
  summary: string;
  imageUrl: string;
  offerType: "VOUCHER" | "COUPON";
  subOfferPublicId: string;
  subTitle: string;
  cost: string;
  available: number;
  tenantId: string;
}): Promise<void> {
  const offer = await prisma.offer.upsert({
    where: { publicId: input.publicId },
    update: { status: "ACTIVE" },
    create: {
      publicId: input.publicId,
      tenantId: input.tenantId,
      category: input.category,
      title: input.title,
      summary: input.summary,
      imageUrl: input.imageUrl,
      offerType: input.offerType,
      status: "ACTIVE",
    },
  });

  const subOffer = await prisma.subOffer.upsert({
    where: { publicId: input.subOfferPublicId },
    update: { status: "ACTIVE" },
    create: {
      publicId: input.subOfferPublicId,
      offerId: offer.id,
      title: input.subTitle,
      summary: "Use online or in-store",
      terms: "Valid for 12 months. Not combinable with other discounts.",
      imageUrls: [subOfferImageUrl(input.subOfferPublicId)],
      status: "ACTIVE",
    },
  });

  await prisma.costOption.deleteMany({ where: { subOfferId: subOffer.id } });

  await prisma.costOption.create({
    data: {
      subOfferId: subOffer.id,
      type: "FIXED",
      cost: input.cost,
      currency: "ILS",
      available: input.available,
      status: "ACTIVE",
    },
  });
}

/** Seeds a custom gift-card offer with a minimum and maximum amount range. */
async function seedCustomOffer(tenantId: string): Promise<void> {
  const offer = await prisma.offer.upsert({
    where: { publicId: "offer_custom_gift_card" },
    update: { status: "ACTIVE" },
    create: {
      publicId: "offer_custom_gift_card",
      tenantId,
      category: "gift-card",
      title: "Custom Gift Card",
      summary: "Choose a custom DigiProduct gift-card amount",
      imageUrl: offerImageUrl("offer_custom_gift_card"),
      offerType: "GIFT_CARD",
      status: "ACTIVE",
    },
  });

  const subOffer = await prisma.subOffer.upsert({
    where: { publicId: "sub_custom_gift_card" },
    update: { status: "ACTIVE" },
    create: {
      publicId: "sub_custom_gift_card",
      offerId: offer.id,
      title: "Custom ILS Gift Card",
      summary: "Choose any amount from 100 to 1000 ILS",
      terms: "Valid for 12 months. The amount cannot be split after purchase.",
      imageUrls: [subOfferImageUrl("sub_custom_gift_card")],
      status: "ACTIVE",
    },
  });

  await prisma.costOption.deleteMany({ where: { subOfferId: subOffer.id } });

  await prisma.costOption.create({
    data: {
      subOfferId: subOffer.id,
      type: "CUSTOM",
      minAmount: "100",
      maxAmount: "1000",
      currency: "ILS",
      available: 120,
      status: "ACTIVE",
    },
  });
}

void seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
