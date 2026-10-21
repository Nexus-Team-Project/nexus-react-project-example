-- CreateTable
CREATE TABLE "SandboxSpace" (
    "id" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "createdIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SandboxSpace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SandboxContact" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "externalId" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "normalizedEmail" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "allowedServices" TEXT[],
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SandboxContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SandboxColumn" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SandboxColumn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SandboxSpace_keyHash_key" ON "SandboxSpace"("keyHash");

-- CreateIndex
CREATE INDEX "SandboxSpace_createdIp_createdAt_idx" ON "SandboxSpace"("createdIp", "createdAt");

-- CreateIndex
CREATE INDEX "SandboxSpace_expiresAt_idx" ON "SandboxSpace"("expiresAt");

-- CreateIndex
CREATE INDEX "SandboxContact_spaceId_createdAt_idx" ON "SandboxContact"("spaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SandboxContact_spaceId_normalizedEmail_key" ON "SandboxContact"("spaceId", "normalizedEmail");

-- CreateIndex
CREATE UNIQUE INDEX "SandboxContact_spaceId_phone_key" ON "SandboxContact"("spaceId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "SandboxContact_spaceId_externalId_key" ON "SandboxContact"("spaceId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "SandboxColumn_spaceId_fieldId_key" ON "SandboxColumn"("spaceId", "fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "SandboxColumn_spaceId_normalizedName_key" ON "SandboxColumn"("spaceId", "normalizedName");

-- AddForeignKey
ALTER TABLE "SandboxContact" ADD CONSTRAINT "SandboxContact_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "SandboxSpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SandboxColumn" ADD CONSTRAINT "SandboxColumn_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "SandboxSpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

