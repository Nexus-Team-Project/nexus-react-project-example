/*
  Warnings:

  - Added the required column `cost` to the `OfferVariants` table without a default value. This is not possible if the table is not empty.
  - Added the required column `value` to the `OfferVariants` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OfferVariants" ADD COLUMN     "cost" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "value" DECIMAL(65,30) NOT NULL;
