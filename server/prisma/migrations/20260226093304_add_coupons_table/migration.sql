-- CreateEnum
CREATE TYPE "CouponStatus" AS ENUM ('available', 'used');

-- CreateTable
CREATE TABLE "Coupons" (
    "id" UUID NOT NULL,
    "offer_id" UUID NOT NULL,
    "subOffer_id" UUID,
    "tenant_id" UUID NOT NULL,
    "purchase_id" UUID,
    "barcode" TEXT,
    "sku" TEXT,
    "price" DECIMAL(65,30),
    "cost" DECIMAL(65,30),
    "price_for_consumer" DECIMAL(65,30),
    "email_template_id" INTEGER,
    "user_email" TEXT,
    "issued_date" TIMESTAMP(3),
    "expired_date" TIMESTAMP(3),
    "status" "CouponStatus" NOT NULL DEFAULT 'available',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "Coupons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Coupons_purchase_id_key" ON "Coupons"("purchase_id");

-- AddForeignKey
ALTER TABLE "Coupons" ADD CONSTRAINT "Coupons_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "MerchantsOffers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupons" ADD CONSTRAINT "Coupons_subOffer_id_fkey" FOREIGN KEY ("subOffer_id") REFERENCES "SubOffers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupons" ADD CONSTRAINT "Coupons_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupons" ADD CONSTRAINT "Coupons_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "Purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
