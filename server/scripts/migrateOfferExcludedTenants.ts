import prisma from "../src/prisma";

async function migrateOfferExcludedTenants() {
  console.log("Starting migration of excluded tenants...");

  // Get all offers with excludedTenantsCol
  const offers = await prisma.merchantsOffers.findMany({
    where: {
      excludedTenantsCol: {
        not: null,
      },
    },
  });

  console.log(`Found ${offers.length} offers to process`);

  for (const offer of offers) {
    if (!offer.excludedTenantsCol) continue;

    // Parse tenant IDs - handle both comma-separated and JSON array format
    let cleanedString = offer.excludedTenantsCol.trim();

    // Remove square brackets if present (JSON array format)
    if (cleanedString.startsWith("[") && cleanedString.endsWith("]")) {
      cleanedString = cleanedString.slice(1, -1);
    }

    // Remove quotes around the string if present
    if (cleanedString.startsWith('"') && cleanedString.endsWith('"')) {
      cleanedString = cleanedString.slice(1, -1);
    }

    const tenantIds = cleanedString
      .split(",")
      .map((id) => id.trim().replace(/["\[\]]/g, "")) // Remove any remaining quotes or brackets
      .filter((id) => id.length > 0);

    console.log(
      `Processing offer ${offer.id}: ${tenantIds.length} excluded tenants`,
    );

    // Create join table records for each tenant
    for (const tenantId of tenantIds) {
      // Check if tenant exists
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (tenant) {
        // Create join table record
        await prisma.offerExcludedTenants.upsert({
          where: {
            offerId_tenantId: {
              offerId: offer.id,
              tenantId: tenantId,
            },
          },
          create: {
            offerId: offer.id,
            tenantId: tenantId,
          },
          update: {},
        });
        console.log(`  ✓ Connected tenant ${tenantId}`);
      } else {
        console.log(`  ✗ Tenant ${tenantId} not found`);
      }
    }
  }

  console.log("Migration completed!");
  await prisma.$disconnect();
}

migrateOfferExcludedTenants();
