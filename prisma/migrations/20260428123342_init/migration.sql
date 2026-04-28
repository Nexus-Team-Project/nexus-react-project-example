-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ApiTokenType" AS ENUM ('PARTNER', 'USER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "OfferType" AS ENUM ('VOUCHER', 'COUPON', 'GIFT_CARD', 'BENEFIT');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SubOfferStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CostOptionType" AS ENUM ('FIXED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CostOptionStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProviderName" AS ENUM ('PAYME');

-- CreateEnum
CREATE TYPE "ProviderEnvironment" AS ENUM ('SANDBOX', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "PaymentSessionStatus" AS ENUM ('CREATED', 'REDIRECTED', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BenefitStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "type" "ApiTokenType" NOT NULL,
    "tenantId" TEXT,
    "userEmail" TEXT,
    "userEmailNormalized" TEXT,
    "scopes" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "fullName" TEXT,
    "phone" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "offerType" "OfferType" NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubOffer" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "terms" TEXT NOT NULL,
    "imageUrls" JSONB NOT NULL,
    "status" "SubOfferStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostOption" (
    "id" TEXT NOT NULL,
    "subOfferId" TEXT NOT NULL,
    "type" "CostOptionType" NOT NULL,
    "cost" DECIMAL(12,2),
    "minAmount" DECIMAL(12,2),
    "maxAmount" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "available" INTEGER NOT NULL,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "sold" INTEGER NOT NULL DEFAULT 0,
    "status" "CostOptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "subOfferId" TEXT,
    "costOptionId" TEXT,
    "userEmail" TEXT NOT NULL,
    "userEmailNormalized" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "buyerPhone" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "receiptFullName" TEXT,
    "receiptEmail" TEXT,
    "receiptPhone" TEXT,
    "receiptNotes" TEXT,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSession" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "provider" "PaymentProviderName" NOT NULL DEFAULT 'PAYME',
    "providerEnvironment" "ProviderEnvironment" NOT NULL,
    "providerSessionId" TEXT,
    "providerSaleId" TEXT,
    "checkoutUrl" TEXT NOT NULL,
    "status" "PaymentSessionStatus" NOT NULL DEFAULT 'CREATED',
    "requestPayload" JSONB NOT NULL,
    "responsePayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssuedBenefit" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userEmailNormalized" TEXT NOT NULL,
    "benefitType" "OfferType" NOT NULL,
    "codeHash" TEXT,
    "codeLast4" TEXT,
    "displayCodeEncrypted" TEXT,
    "status" "BenefitStatus" NOT NULL DEFAULT 'ACTIVE',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "IssuedBenefit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProviderName" NOT NULL DEFAULT 'PAYME',
    "eventId" TEXT,
    "bodyHash" TEXT NOT NULL,
    "signatureValid" BOOLEAN NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "processingError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_tenantId_key" ON "Tenant"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiToken_tokenHash_key" ON "ApiToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ApiToken_tenantId_type_revokedAt_idx" ON "ApiToken"("tenantId", "type", "revokedAt");

-- CreateIndex
CREATE INDEX "ApiToken_tenantId_userEmailNormalized_type_idx" ON "ApiToken"("tenantId", "userEmailNormalized", "type");

-- CreateIndex
CREATE INDEX "User_tenantId_status_idx" ON "User"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_emailNormalized_key" ON "User"("tenantId", "emailNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_publicId_key" ON "Offer"("publicId");

-- CreateIndex
CREATE INDEX "Offer_tenantId_status_createdAt_idx" ON "Offer"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Offer_tenantId_category_status_createdAt_idx" ON "Offer"("tenantId", "category", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SubOffer_publicId_key" ON "SubOffer"("publicId");

-- CreateIndex
CREATE INDEX "SubOffer_offerId_status_idx" ON "SubOffer"("offerId", "status");

-- CreateIndex
CREATE INDEX "CostOption_subOfferId_status_idx" ON "CostOption"("subOfferId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_publicId_key" ON "Purchase"("publicId");

-- CreateIndex
CREATE INDEX "Purchase_tenantId_userEmail_idx" ON "Purchase"("tenantId", "userEmail");

-- CreateIndex
CREATE INDEX "Purchase_tenantId_userEmailNormalized_status_createdAt_idx" ON "Purchase"("tenantId", "userEmailNormalized", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Purchase_tenantId_userId_status_createdAt_idx" ON "Purchase"("tenantId", "userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Purchase_tenantId_offerId_status_createdAt_idx" ON "Purchase"("tenantId", "offerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Purchase_tenantId_paidAt_idx" ON "Purchase"("tenantId", "paidAt");

-- CreateIndex
CREATE INDEX "Purchase_tenantId_offerId_paidAt_idx" ON "Purchase"("tenantId", "offerId", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentSession_purchaseId_key" ON "PaymentSession"("purchaseId");

-- CreateIndex
CREATE INDEX "PaymentSession_provider_providerSessionId_idx" ON "PaymentSession"("provider", "providerSessionId");

-- CreateIndex
CREATE INDEX "PaymentSession_provider_providerSaleId_idx" ON "PaymentSession"("provider", "providerSaleId");

-- CreateIndex
CREATE INDEX "PaymentSession_purchaseId_idx" ON "PaymentSession"("purchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "IssuedBenefit_purchaseId_key" ON "IssuedBenefit"("purchaseId");

-- CreateIndex
CREATE INDEX "IssuedBenefit_tenantId_userEmail_status_idx" ON "IssuedBenefit"("tenantId", "userEmail", "status");

-- CreateIndex
CREATE INDEX "IssuedBenefit_tenantId_userEmailNormalized_status_idx" ON "IssuedBenefit"("tenantId", "userEmailNormalized", "status");

-- CreateIndex
CREATE INDEX "IssuedBenefit_tenantId_offerId_status_idx" ON "IssuedBenefit"("tenantId", "offerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_bodyHash_key" ON "WebhookEvent"("bodyHash");

-- CreateIndex
CREATE INDEX "WebhookEvent_provider_eventId_idx" ON "WebhookEvent"("provider", "eventId");

-- CreateIndex
CREATE INDEX "WebhookEvent_provider_createdAt_idx" ON "WebhookEvent"("provider", "createdAt");

-- AddForeignKey
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubOffer" ADD CONSTRAINT "SubOffer_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostOption" ADD CONSTRAINT "CostOption_subOfferId_fkey" FOREIGN KEY ("subOfferId") REFERENCES "SubOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_subOfferId_fkey" FOREIGN KEY ("subOfferId") REFERENCES "SubOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_costOptionId_fkey" FOREIGN KEY ("costOptionId") REFERENCES "CostOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSession" ADD CONSTRAINT "PaymentSession_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedBenefit" ADD CONSTRAINT "IssuedBenefit_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedBenefit" ADD CONSTRAINT "IssuedBenefit_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedBenefit" ADD CONSTRAINT "IssuedBenefit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
