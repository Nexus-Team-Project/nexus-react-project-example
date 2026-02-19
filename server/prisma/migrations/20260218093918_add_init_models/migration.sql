-- CreateEnum
CREATE TYPE "OfferType" AS ENUM ('Link', 'Registration_Service', 'Coupon', 'ContactMe', 'Purchase');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('active', 'inactive', 'demo');

-- CreateEnum
CREATE TYPE "MerchantStatus" AS ENUM ('pending', 'active', 'suspended', 'inactive');

-- CreateEnum
CREATE TYPE "PaymeStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('not_started', 'in_progress', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('active', 'inactive', 'pending');

-- CreateTable
CREATE TABLE "Tenants" (
    "id" UUID NOT NULL,
    "tenant_id" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "title" TEXT,
    "image" TEXT,
    "contact_first_name" TEXT,
    "contact_last_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "status" TEXT,
    "join_date" DATE DEFAULT CURRENT_TIMESTAMP,
    "official_site_url" TEXT,
    "newsletter_status" BOOLEAN,
    "official_sign_up" TEXT,
    "official_login" TEXT,
    "report_email" TEXT,

    CONSTRAINT "Tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Merchants" (
    "id" UUID NOT NULL,
    "business_name" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "business_category" TEXT,
    "business_registration_number" TEXT NOT NULL,
    "business_type" TEXT NOT NULL,
    "vat_number" TEXT,
    "website_url" TEXT,
    "bank_name" TEXT NOT NULL,
    "bank_branch" TEXT NOT NULL,
    "bank_account" TEXT NOT NULL,
    "bank_account_holder" TEXT NOT NULL,
    "commission_rate" DECIMAL(65,30) NOT NULL,
    "payment_terms" TEXT,
    "status" "MerchantStatus" NOT NULL DEFAULT 'pending',
    "join_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approval_date" TIMESTAMP(3),
    "payme_seller_id" TEXT,
    "payme_api_key" TEXT,
    "payme_status" "PaymeStatus",
    "kyc_status" "KycStatus" NOT NULL DEFAULT 'not_started',
    "documents_uploaded" JSONB,
    "notes" TEXT,

    CONSTRAINT "Merchants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantsOffers" (
    "id" UUID NOT NULL,
    "merchant_id" UUID,
    "status" "OfferStatus" NOT NULL DEFAULT 'active',
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "images" TEXT,
    "type" "OfferType",
    "category" TEXT,
    "expiration_date" TIMESTAMP(3),
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3),
    "excludedTenantsCol" TEXT,

    CONSTRAINT "MerchantsOffers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantsOffers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "offer_id" UUID,
    "tenant_price" DECIMAL(65,30),

    CONSTRAINT "TenantsOffers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferExcludedTenants" (
    "offerId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,

    CONSTRAINT "OfferExcludedTenants_pkey" PRIMARY KEY ("offerId","tenantId")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantsOffers_tenant_id_offer_id_key" ON "TenantsOffers"("tenant_id", "offer_id");

-- AddForeignKey
ALTER TABLE "MerchantsOffers" ADD CONSTRAINT "MerchantsOffers_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantsOffers" ADD CONSTRAINT "TenantsOffers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantsOffers" ADD CONSTRAINT "TenantsOffers_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "MerchantsOffers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferExcludedTenants" ADD CONSTRAINT "OfferExcludedTenants_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "MerchantsOffers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferExcludedTenants" ADD CONSTRAINT "OfferExcludedTenants_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
