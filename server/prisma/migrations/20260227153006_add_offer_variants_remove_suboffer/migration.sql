/*
  Warnings:

  - You are about to drop the column `subOffer_id` on the `Coupons` table. All the data in the column will be lost.
  - You are about to drop the column `subOffer_id` on the `Purchases` table. All the data in the column will be lost.
  - You are about to drop the column `subOffer_id` on the `TenantsOffers` table. All the data in the column will be lost.
  - You are about to drop the column `operator` on the `VariantOption` table. All the data in the column will be lost.
  - You are about to drop the column `option` on the `VariantOption` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `VariantOption` table. All the data in the column will be lost.
  - You are about to drop the column `variant_id` on the `VariantOption` table. All the data in the column will be lost.
  - You are about to drop the `CostOptions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SubOfferVariantOption` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SubOffers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Variants` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[tenant_id,offer_variant_id]` on the table `TenantsOffers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[offerId,name]` on the table `VariantOption` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `VariantOption` table without a default value. This is not possible if the table is not empty.
  - Added the required column `offerId` to the `VariantOption` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PriceModifiers" AS ENUM ('addition', 'multiplication');

-- DropForeignKey
ALTER TABLE "CostOptions" DROP CONSTRAINT "CostOptions_sub_offer_id_fkey";

-- DropForeignKey
ALTER TABLE "Coupons" DROP CONSTRAINT "Coupons_subOffer_id_fkey";

-- DropForeignKey
ALTER TABLE "Purchases" DROP CONSTRAINT "Purchases_subOffer_id_fkey";

-- DropForeignKey
ALTER TABLE "SubOfferVariantOption" DROP CONSTRAINT "SubOfferVariantOption_subOffer_id_fkey";

-- DropForeignKey
ALTER TABLE "SubOfferVariantOption" DROP CONSTRAINT "SubOfferVariantOption_variant_option_id_fkey";

-- DropForeignKey
ALTER TABLE "SubOffers" DROP CONSTRAINT "SubOffers_offer_id_fkey";

-- DropForeignKey
ALTER TABLE "TenantsOffers" DROP CONSTRAINT "TenantsOffers_subOffer_id_fkey";

-- DropForeignKey
ALTER TABLE "VariantOption" DROP CONSTRAINT "VariantOption_variant_id_fkey";

-- DropIndex
DROP INDEX "TenantsOffers_tenant_id_subOffer_id_key";

-- AlterTable
ALTER TABLE "Coupons" DROP COLUMN "subOffer_id",
ADD COLUMN     "offer_variant_id" UUID;

-- AlterTable
ALTER TABLE "MerchantsOffers" ADD COLUMN     "base_price" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Purchases" DROP COLUMN "subOffer_id",
ADD COLUMN     "offer_variant_id" UUID;

-- AlterTable
ALTER TABLE "TenantsOffers" DROP COLUMN "subOffer_id",
ADD COLUMN     "offer_variant_id" UUID;

-- AlterTable
ALTER TABLE "VariantOption" DROP COLUMN "operator",
DROP COLUMN "option",
DROP COLUMN "value",
DROP COLUMN "variant_id",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "offerId" UUID NOT NULL;

-- DropTable
DROP TABLE "CostOptions";

-- DropTable
DROP TABLE "SubOfferVariantOption";

-- DropTable
DROP TABLE "SubOffers";

-- DropTable
DROP TABLE "Variants";

-- DropEnum
DROP TYPE "Operators";

-- CreateTable
CREATE TABLE "VariantOptionValue" (
    "id" UUID NOT NULL,
    "optionId" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "priceModifier" "PriceModifiers" NOT NULL,
    "priceValue" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "VariantOptionValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferVariant" (
    "id" UUID NOT NULL,
    "offerId" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "stock_quantity" INTEGER NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "title" TEXT,
    "summary" TEXT,
    "terms" TEXT,
    "images" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferVariantValue" (
    "variantId" UUID NOT NULL,
    "valueId" UUID NOT NULL,

    CONSTRAINT "OfferVariantValue_pkey" PRIMARY KEY ("variantId","valueId")
);

-- CreateIndex
CREATE INDEX "VariantOptionValue_optionId_idx" ON "VariantOptionValue"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "OfferVariant_sku_key" ON "OfferVariant"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "OfferVariant_barcode_key" ON "OfferVariant"("barcode");

-- CreateIndex
CREATE INDEX "OfferVariant_offerId_idx" ON "OfferVariant"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantsOffers_tenant_id_offer_variant_id_key" ON "TenantsOffers"("tenant_id", "offer_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "VariantOption_offerId_name_key" ON "VariantOption"("offerId", "name");

-- AddForeignKey
ALTER TABLE "VariantOption" ADD CONSTRAINT "VariantOption_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "MerchantsOffers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantOptionValue" ADD CONSTRAINT "VariantOptionValue_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "VariantOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferVariant" ADD CONSTRAINT "OfferVariant_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "MerchantsOffers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferVariantValue" ADD CONSTRAINT "OfferVariantValue_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "OfferVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferVariantValue" ADD CONSTRAINT "OfferVariantValue_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "VariantOptionValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantsOffers" ADD CONSTRAINT "TenantsOffers_offer_variant_id_fkey" FOREIGN KEY ("offer_variant_id") REFERENCES "OfferVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchases" ADD CONSTRAINT "Purchases_offer_variant_id_fkey" FOREIGN KEY ("offer_variant_id") REFERENCES "OfferVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupons" ADD CONSTRAINT "Coupons_offer_variant_id_fkey" FOREIGN KEY ("offer_variant_id") REFERENCES "OfferVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
