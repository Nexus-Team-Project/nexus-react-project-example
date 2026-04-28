-- ============================================================
-- Schema overhaul migration
-- ============================================================

-- 1. New enum
-- ============================================================
CREATE TYPE "VoucherCodeStatus" AS ENUM ('available', 'issued', 'used', 'expired', 'cancelled');

-- 2. Drop obsolete dependent tables (order respects FK constraints)
-- ============================================================
DROP TABLE "OfferVariantValue";
DROP TABLE "VariantOptionValue";
DROP TABLE "VariantOption";
DROP TABLE "TenantsOffers";
DROP TABLE "Coupons";

-- 3. Drop obsolete enums
-- ============================================================
DROP TYPE "CouponStatus";
DROP TYPE "PriceModifiers";
DROP TYPE "VariantsType";

-- 4. MerchantsOffers — drop removed columns
-- ============================================================
ALTER TABLE "MerchantsOffers" DROP COLUMN "base_price";
ALTER TABLE "MerchantsOffers" DROP COLUMN "available_quantity";

-- 5. OfferVariant → OfferVariants
--    Rename table, rename columns, drop title, add combination
-- ============================================================
ALTER TABLE "OfferVariant" RENAME TO "OfferVariants";

-- Drop old index before renaming the column it covers
DROP INDEX IF EXISTS "OfferVariant_offerId_idx";

ALTER TABLE "OfferVariants" DROP COLUMN "title";
ALTER TABLE "OfferVariants" RENAME COLUMN "offerId"   TO "offer_id";
ALTER TABLE "OfferVariants" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "OfferVariants" RENAME COLUMN "updatedAt" TO "updated_at";

ALTER TABLE "OfferVariants" ADD COLUMN "combination" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "OfferVariants" ALTER COLUMN "isActive" SET DEFAULT false;

-- Recreate index with canonical name
CREATE INDEX "OfferVariants_offer_id_idx" ON "OfferVariants"("offer_id");

-- 6. OfferExcludedTenants — rename columns in-place (preserves 28 rows)
-- ============================================================
ALTER TABLE "OfferExcludedTenants" DROP CONSTRAINT "OfferExcludedTenants_pkey";
ALTER TABLE "OfferExcludedTenants" RENAME COLUMN "offerId"   TO "offer_id";
ALTER TABLE "OfferExcludedTenants" RENAME COLUMN "tenantId"  TO "tenant_id";
ALTER TABLE "OfferExcludedTenants" ADD CONSTRAINT "OfferExcludedTenants_pkey" PRIMARY KEY ("offer_id", "tenant_id");

-- 7. Purchases — add snapshot price columns + proper tenant FK
-- ============================================================

-- Add required snapshot columns (table is empty so no DEFAULT needed for backfill,
-- but we add/remove DEFAULT in one pass to keep the column NOT NULL cleanly)
ALTER TABLE "Purchases" ADD COLUMN "variant_price" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "Purchases" ADD COLUMN "tenant_delta"  DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "Purchases" ALTER COLUMN "variant_price" DROP DEFAULT;
ALTER TABLE "Purchases" ALTER COLUMN "tenant_delta"  DROP DEFAULT;

-- Promote tenant_id from plain TEXT to UUID FK (table is empty, cast is safe)
ALTER TABLE "Purchases" ALTER COLUMN "tenant_id" TYPE UUID USING tenant_id::UUID;
ALTER TABLE "Purchases" ADD CONSTRAINT "Purchases_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "Tenants"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Add missing indexes
CREATE INDEX "Purchases_user_id_idx"          ON "Purchases"("user_id");
CREATE INDEX "Purchases_offer_id_idx"         ON "Purchases"("offer_id");
CREATE INDEX "Purchases_offer_variant_id_idx" ON "Purchases"("offer_variant_id");
CREATE INDEX "Purchases_tenant_id_idx"        ON "Purchases"("tenant_id");

-- 8. Create OfferOptions
-- ============================================================
CREATE TABLE "OfferOptions" (
    "id"          UUID    NOT NULL DEFAULT gen_random_uuid(),
    "offer_id"    UUID    NOT NULL,
    "option_name" TEXT    NOT NULL,
    "option_type" TEXT    NOT NULL DEFAULT 'text',
    "values"      JSONB   NOT NULL,
    CONSTRAINT "OfferOptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OfferOptions_offer_id_option_name_key" ON "OfferOptions"("offer_id", "option_name");
CREATE        INDEX "OfferOptions_offer_id_idx"             ON "OfferOptions"("offer_id");
ALTER TABLE "OfferOptions" ADD CONSTRAINT "OfferOptions_offer_id_fkey"
    FOREIGN KEY ("offer_id") REFERENCES "MerchantsOffers"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 9. Create VoucherAdmins
-- ============================================================
CREATE TABLE "VoucherAdmins" (
    "id"               UUID            NOT NULL DEFAULT gen_random_uuid(),
    "variant_id"       UUID            NOT NULL,
    "sku"              TEXT            NOT NULL,
    "cost"             DECIMAL(65,30)  NOT NULL,
    "price"            DECIMAL(65,30)  NOT NULL,
    "settlement_terms" TEXT,
    CONSTRAINT "VoucherAdmins_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VoucherAdmins_variant_id_key" ON "VoucherAdmins"("variant_id");
ALTER TABLE "VoucherAdmins" ADD CONSTRAINT "VoucherAdmins_variant_id_fkey"
    FOREIGN KEY ("variant_id") REFERENCES "OfferVariants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 10. Create VoucherCodes
-- ============================================================
CREATE TABLE "VoucherCodes" (
    "id"             UUID                NOT NULL DEFAULT gen_random_uuid(),
    "variant_id"     UUID                NOT NULL,
    "sku"            TEXT                NOT NULL,
    "batch_id"       TEXT,
    "barcode"        TEXT,
    "barcode_image"  TEXT,
    "status"         "VoucherCodeStatus" NOT NULL DEFAULT 'available',
    "issued_date"    TIMESTAMP(3),
    "expired_date"   TIMESTAMP(3),
    "fulfilled_date" TIMESTAMP(3),
    "purchase_id"    UUID,
    CONSTRAINT "VoucherCodes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VoucherCodes_purchase_id_key"         ON "VoucherCodes"("purchase_id");
CREATE        INDEX "VoucherCodes_sku_status_idx"          ON "VoucherCodes"("sku", "status");
CREATE        INDEX "VoucherCodes_variant_id_status_idx"   ON "VoucherCodes"("variant_id", "status");
ALTER TABLE "VoucherCodes" ADD CONSTRAINT "VoucherCodes_variant_id_fkey"
    FOREIGN KEY ("variant_id") REFERENCES "OfferVariants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VoucherCodes" ADD CONSTRAINT "VoucherCodes_purchase_id_fkey"
    FOREIGN KEY ("purchase_id") REFERENCES "Purchases"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- 11. Create TenantOffers
-- ============================================================
CREATE TABLE "TenantOffers" (
    "id"           UUID            NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id"    UUID            NOT NULL,
    "offer_id"     UUID            NOT NULL,
    "variant_id"   UUID            NOT NULL,
    "tenant_delta" DECIMAL(65,30)  NOT NULL DEFAULT 0,
    "is_active"    BOOLEAN         NOT NULL DEFAULT true,
    CONSTRAINT "TenantOffers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TenantOffers_tenant_id_variant_id_key" ON "TenantOffers"("tenant_id", "variant_id");
CREATE        INDEX "TenantOffers_tenant_id_idx"            ON "TenantOffers"("tenant_id");
CREATE        INDEX "TenantOffers_offer_id_idx"             ON "TenantOffers"("offer_id");
CREATE        INDEX "TenantOffers_variant_id_idx"           ON "TenantOffers"("variant_id");
ALTER TABLE "TenantOffers" ADD CONSTRAINT "TenantOffers_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "Tenants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TenantOffers" ADD CONSTRAINT "TenantOffers_offer_id_fkey"
    FOREIGN KEY ("offer_id") REFERENCES "MerchantsOffers"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TenantOffers" ADD CONSTRAINT "TenantOffers_variant_id_fkey"
    FOREIGN KEY ("variant_id") REFERENCES "OfferVariants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
