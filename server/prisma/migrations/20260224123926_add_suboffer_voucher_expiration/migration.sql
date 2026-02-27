/*
  Warnings:

  - Added the required column `price` to the `SubOffers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "OfferType" ADD VALUE 'Voucher';

-- AlterTable
ALTER TABLE "MerchantsOffers" ADD COLUMN     "time_limit" INTEGER;

-- AlterTable
ALTER TABLE "Purchases" ADD COLUMN     "expiration_date" TIMESTAMP(3),
ADD COLUMN     "subOffer_id" UUID;

-- AlterTable: add price with a temporary default of 0 for existing rows, then drop the default
ALTER TABLE "SubOffers" ADD COLUMN "price" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "SubOffers" ALTER COLUMN "price" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "Purchases" ADD CONSTRAINT "Purchases_subOffer_id_fkey" FOREIGN KEY ("subOffer_id") REFERENCES "SubOffers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
