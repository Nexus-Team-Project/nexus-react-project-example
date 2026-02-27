-- CreateEnum
CREATE TYPE "Operators" AS ENUM ('addition', 'multiplication');

-- CreateEnum
CREATE TYPE "VariantsType" AS ENUM ('color', 'size', 'material', 'style', 'other');

-- CreateTable
CREATE TABLE "Variants" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "VariantsType" NOT NULL,

    CONSTRAINT "Variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariantOption" (
    "id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "option" TEXT NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "operator" "Operators" NOT NULL,

    CONSTRAINT "VariantOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubOfferVariantOption" (
    "subOffer_id" UUID NOT NULL,
    "variant_option_id" UUID NOT NULL,

    CONSTRAINT "SubOfferVariantOption_pkey" PRIMARY KEY ("subOffer_id","variant_option_id")
);

-- AddForeignKey
ALTER TABLE "VariantOption" ADD CONSTRAINT "VariantOption_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "Variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubOfferVariantOption" ADD CONSTRAINT "SubOfferVariantOption_subOffer_id_fkey" FOREIGN KEY ("subOffer_id") REFERENCES "SubOffers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubOfferVariantOption" ADD CONSTRAINT "SubOfferVariantOption_variant_option_id_fkey" FOREIGN KEY ("variant_option_id") REFERENCES "VariantOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
