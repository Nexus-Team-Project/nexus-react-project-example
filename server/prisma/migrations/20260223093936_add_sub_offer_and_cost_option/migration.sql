-- CreateTable
CREATE TABLE "SubOffers" (
    "id" UUID NOT NULL,
    "offer_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "images" TEXT[],
    "terms" TEXT,

    CONSTRAINT "SubOffers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostOptions" (
    "id" UUID NOT NULL,
    "sub_offer_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "cost" DECIMAL(65,30) NOT NULL,
    "available" INTEGER,

    CONSTRAINT "CostOptions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SubOffers" ADD CONSTRAINT "SubOffers_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "MerchantsOffers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostOptions" ADD CONSTRAINT "CostOptions_sub_offer_id_fkey" FOREIGN KEY ("sub_offer_id") REFERENCES "SubOffers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
