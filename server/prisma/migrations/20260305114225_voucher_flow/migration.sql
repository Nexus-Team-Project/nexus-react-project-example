/*
  Warnings:

  - You are about to drop the column `cost` on the `VoucherAdmins` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `VoucherAdmins` table. All the data in the column will be lost.
  - You are about to drop the column `sku` on the `VoucherAdmins` table. All the data in the column will be lost.
  - Added the required column `batch_id` to the `VoucherAdmins` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cost_price` to the `VoucherAdmins` table without a default value. This is not possible if the table is not empty.
  - Added the required column `purchase_value` to the `VoucherAdmins` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TenantOffers" ADD COLUMN     "tenant_price" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "VoucherAdmins" DROP COLUMN "cost",
DROP COLUMN "price",
DROP COLUMN "sku",
ADD COLUMN     "batch_id" UUID NOT NULL,
ADD COLUMN     "cost_price" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "purchase_value" DECIMAL(65,30) NOT NULL;
