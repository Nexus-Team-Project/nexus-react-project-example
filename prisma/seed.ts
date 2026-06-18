/** This seed script creates DigiProduct tenants, users, offers, and test tokens. */
import { PrismaClient } from "@prisma/client";
import { env } from "../src/config/env.js";
import { createOpaqueToken, hashPassword, sha256 } from "../src/shared/security.js";
import { signTestToken } from "../src/modules/auth/token.service.js";

const prisma = new PrismaClient();
const DEMO_PARTNER_EMAIL = "partner@digiproduct.test";
const DEMO_PARTNER_PASSWORD = "demo-partner-123";
const DEMO_USER_EMAIL = "user@example.com";
const DEMO_USER_PASSWORD = "demo-user-123";

/** Seeds all local data needed for manual API verification. */
async function seed(): Promise<void> {
  const tenant = await prisma.tenant.upsert({
    where: { tenantId: "digiproduct" },
    update: { name: "DigiProduct", status: "ACTIVE" },
    create: { tenantId: "digiproduct", name: "DigiProduct", status: "ACTIVE" },
  });

  const user = await prisma.user.upsert({
    where: { tenantId_emailNormalized: { tenantId: tenant.id, emailNormalized: DEMO_USER_EMAIL } },
    update: { status: "ACTIVE" },
    create: {
      tenantId: tenant.id,
      email: DEMO_USER_EMAIL,
      emailNormalized: DEMO_USER_EMAIL,
      fullName: "Test User",
      phone: "0501234567",
      status: "ACTIVE",
    },
  });

  // Real partner coupons from coupons_selected.csv. These are percentage-discount
  // codes (not fixed-price vouchers), so the price below is a sample test amount
  // for the PayMe sandbox flow only. Images keep the original Wix URIs from the CSV.
  await seedOffer({
    publicId: "offer_sepa",
    category: "קהילה",
    title: "SEPA - ספה",
    summary: "קבלו 20% על קטגורית הצלילה",
    imageUrl: "wix:image://v1/57cf68_1c39ac42f1f84a6eafcd678f9c9d0f8d~mv2.jpg/sepa_opt.jpg#originWidth=600&originHeight=600",
    offerType: "COUPON",
    subOfferPublicId: "sub_sepa_20",
    subTitle: "20% הנחה על קטגוריית הצלילה והשנרקול",
    subSummary: "באתר הכניסו קוד קופון בעת הרכישה, בחנות הזדהו עם האזור האישי של מעגל הכרישים בתוקף.",
    terms: "ההנחה ניתנת רק לחברי מעגל הכרישים בתוקף, על מוצרים פיזיים בלבד. אין כפל מבצעים. לא חל על שירותים, שוברים או דמי משלוח.",
    imageUrl_sub: "wix:image://v1/57cf68_1c39ac42f1f84a6eafcd678f9c9d0f8d~mv2.jpg/sepa_opt.jpg#originWidth=600&originHeight=600",
    cost: "199",
    available: 35,
    tenantId: tenant.id,
  });

  await seedOffer({
    publicId: "offer_ovali",
    category: "אלקטרוניקה",
    title: "OVALI",
    summary: "להנות עם 12% הנחה על כל דגמי השואבים והרובוטים של OVALI",
    imageUrl: "wix:image://v1/57cf68_1ddcdd6688a9466682d4ef5c44b34942~mv2.jpg/ovali_opt.jpg#originWidth=600&originHeight=600",
    offerType: "COUPON",
    subOfferPublicId: "sub_ovali_12",
    subTitle: "12% הנחה על כל דגמי השואבים והרובוטים",
    subSummary: "מעתיקים את קוד הקופון, לוחצים על הכפתור ומועברים לאתר OVALI, בוחרים מוצר ומזינים את הקוד.",
    terms: "משתנה בהתאם למוצר על פי תקנון אתר OVALI. ההנחה לא חלה בסניפים חיפה ובאר שבע.",
    imageUrl_sub: "wix:image://v1/57cf68_1ddcdd6688a9466682d4ef5c44b34942~mv2.jpg/ovali_opt.jpg#originWidth=600&originHeight=600",
    cost: "349",
    available: 25,
    tenantId: tenant.id,
  });

  // Replace mode: archive any other offers for this tenant so only the CSV
  // coupons stay ACTIVE and visible in the list/detail endpoints and the UI.
  await prisma.offer.updateMany({
    where: { tenantId: tenant.id, publicId: { notIn: ["offer_sepa", "offer_ovali"] } },
    data: { status: "ARCHIVED" },
  });

  await seedLoginAccounts({ tenantId: tenant.id, userId: user.id });

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

  const userScopes = ["offers:read", "purchase:create", "status:read"];
  const userToken = signTestToken({ sub: DEMO_USER_EMAIL, type: "USER", tenant: "digiproduct", email: DEMO_USER_EMAIL, scopes: userScopes }, "7d");
  await prisma.apiToken.upsert({
    where: { tokenHash: sha256(userToken) },
    update: { revokedAt: null },
    create: {
      tokenHash: sha256(userToken),
      type: "USER",
      tenantId: tenant.id,
      userEmail: DEMO_USER_EMAIL,
      userEmailNormalized: DEMO_USER_EMAIL,
      scopes: userScopes,
    },
  });

  const unusedOpaqueToken = createOpaqueToken();
  console.log("Seed complete.");
  console.log(`Demo partner login: ${DEMO_PARTNER_EMAIL} / ${DEMO_PARTNER_PASSWORD}`);
  console.log(`Demo user login: ${DEMO_USER_EMAIL} / ${DEMO_USER_PASSWORD}`);
  console.log(`Partner bearer token: ${partnerToken}`);
  console.log(`User bearer token: ${userToken}`);
  console.log(`Unused opaque token sample: ${unusedOpaqueToken}`);
  console.log(`Configured PARTNER_API_TOKEN_HASH length: ${env.PARTNER_API_TOKEN_HASH.length}`);
}

/** Seeds hashed login accounts for the demo partner and related demo user. */
async function seedLoginAccounts(input: { tenantId: string; userId: string }): Promise<void> {
  await prisma.loginAccount.upsert({
    where: { role_emailNormalized: { role: "PARTNER", emailNormalized: DEMO_PARTNER_EMAIL } },
    update: {
      email: DEMO_PARTNER_EMAIL,
      passwordHash: await hashPassword(DEMO_PARTNER_PASSWORD),
      tenantId: input.tenantId,
      userId: null,
      status: "ACTIVE",
    },
    create: {
      role: "PARTNER",
      email: DEMO_PARTNER_EMAIL,
      emailNormalized: DEMO_PARTNER_EMAIL,
      passwordHash: await hashPassword(DEMO_PARTNER_PASSWORD),
      tenantId: input.tenantId,
      status: "ACTIVE",
    },
  });

  await prisma.loginAccount.upsert({
    where: { role_emailNormalized: { role: "USER", emailNormalized: DEMO_USER_EMAIL } },
    update: {
      email: DEMO_USER_EMAIL,
      passwordHash: await hashPassword(DEMO_USER_PASSWORD),
      tenantId: input.tenantId,
      userId: input.userId,
      status: "ACTIVE",
    },
    create: {
      role: "USER",
      email: DEMO_USER_EMAIL,
      emailNormalized: DEMO_USER_EMAIL,
      passwordHash: await hashPassword(DEMO_USER_PASSWORD),
      tenantId: input.tenantId,
      userId: input.userId,
      status: "ACTIVE",
    },
  });
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
  subSummary: string;
  terms: string;
  imageUrl_sub: string;
  cost: string;
  available: number;
  tenantId: string;
}): Promise<void> {
  const offer = await prisma.offer.upsert({
    where: { publicId: input.publicId },
    update: { status: "ACTIVE", imageUrl: input.imageUrl, title: input.title, summary: input.summary, category: input.category },
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
    update: { status: "ACTIVE", imageUrls: [input.imageUrl_sub], title: input.subTitle, summary: input.subSummary, terms: input.terms },
    create: {
      publicId: input.subOfferPublicId,
      offerId: offer.id,
      title: input.subTitle,
      summary: input.subSummary,
      terms: input.terms,
      imageUrls: [input.imageUrl_sub],
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

void seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
