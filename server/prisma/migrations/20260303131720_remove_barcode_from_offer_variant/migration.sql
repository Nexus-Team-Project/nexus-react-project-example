/*
  Warnings:

  - You are about to drop the column `barcode` on the `OfferVariants` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "OfferVariant_barcode_key";

-- AlterTable
ALTER TABLE "OfferOptions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OfferVariants" RENAME CONSTRAINT "OfferVariant_pkey" TO "OfferVariants_pkey";

-- AlterTable
ALTER TABLE "OfferVariants" DROP COLUMN "barcode";

-- AlterTable
ALTER TABLE "OfferVariants" ALTER COLUMN "combination" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TenantOffers" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "VoucherAdmins" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "VoucherCodes" ALTER COLUMN "id" DROP DEFAULT;

-- RenameForeignKey
ALTER TABLE "OfferExcludedTenants" RENAME CONSTRAINT "OfferExcludedTenants_offerId_fkey" TO "OfferExcludedTenants_offer_id_fkey";

-- RenameForeignKey
ALTER TABLE "OfferExcludedTenants" RENAME CONSTRAINT "OfferExcludedTenants_tenantId_fkey" TO "OfferExcludedTenants_tenant_id_fkey";

-- RenameForeignKey
ALTER TABLE "OfferVariants" RENAME CONSTRAINT "OfferVariant_offerId_fkey" TO "OfferVariants_offer_id_fkey";

-- RenameIndex
ALTER INDEX "OfferVariant_sku_key" RENAME TO "OfferVariants_sku_key";
