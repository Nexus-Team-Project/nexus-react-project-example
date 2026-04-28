-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('pending', 'completed', 'failed', 'refunded', 'cancelled');

-- CreateTable
CREATE TABLE "Purchases" (
    "id" UUID NOT NULL,
    "offer_id" UUID,
    "tenant_id" UUID,
    "buyer_name" TEXT NOT NULL,
    "buyer_email" TEXT NOT NULL,
    "buyer_phone" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "transaction_id" TEXT NOT NULL,
    "payme_sale_id" TEXT,
    "payme_sale_code" INTEGER,
    "sale_url" TEXT,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'pending',
    "receipt_details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "Purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Purchases_transaction_id_key" ON "Purchases"("transaction_id");

-- AddForeignKey
ALTER TABLE "Purchases" ADD CONSTRAINT "Purchases_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "MerchantsOffers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
