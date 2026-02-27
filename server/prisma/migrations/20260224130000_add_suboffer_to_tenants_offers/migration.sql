-- AlterTable: add subOffer_id FK to TenantsOffers
ALTER TABLE "TenantsOffers" ADD COLUMN "subOffer_id" UUID;

-- AddForeignKey
ALTER TABLE "TenantsOffers" ADD CONSTRAINT "TenantsOffers_subOffer_id_fkey"
  FOREIGN KEY ("subOffer_id") REFERENCES "SubOffers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropIndex: remove old unique constraint on (tenant_id, offer_id)
DROP INDEX IF EXISTS "TenantsOffers_tenant_id_offer_id_key";

-- CreateIndex: new unique constraint on (tenant_id, subOffer_id)
CREATE UNIQUE INDEX "TenantsOffers_tenant_id_subOffer_id_key" ON "TenantsOffers"("tenant_id", "subOffer_id");
