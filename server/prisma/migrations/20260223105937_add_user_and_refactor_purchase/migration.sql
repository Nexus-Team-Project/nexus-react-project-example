/*
  Warnings:

  - You are about to drop the column `buyer_email` on the `Purchases` table. All the data in the column will be lost.
  - You are about to drop the column `buyer_name` on the `Purchases` table. All the data in the column will be lost.
  - You are about to drop the column `buyer_phone` on the `Purchases` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Purchases" DROP COLUMN "buyer_email",
DROP COLUMN "buyer_name",
DROP COLUMN "buyer_phone",
ADD COLUMN     "user_id" UUID;

-- CreateTable
CREATE TABLE "Users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "tenant_id" UUID,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- AddForeignKey
ALTER TABLE "Users" ADD CONSTRAINT "Users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchases" ADD CONSTRAINT "Purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
