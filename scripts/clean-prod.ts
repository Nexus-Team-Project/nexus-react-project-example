import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL as string
    }
  }
});

async function main() {
  console.log("Wiping purchase-related data...");
  const res1 = await prisma.issuedBenefit.deleteMany();
  console.log(`Deleted ${res1.count} IssuedBenefit records.`);
  
  const res2 = await prisma.paymentSession.deleteMany();
  console.log(`Deleted ${res2.count} PaymentSession records.`);
  
  const res3 = await prisma.purchase.deleteMany();
  console.log(`Deleted ${res3.count} Purchase records.`);
  
  const res4 = await prisma.webhookEvent.deleteMany();
  console.log(`Deleted ${res4.count} WebhookEvent records.`);
  
  console.log("Done.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
