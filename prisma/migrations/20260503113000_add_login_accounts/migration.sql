-- This migration stores hashed demo login credentials for partner and user sessions.
CREATE TYPE "LoginAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "LoginAccount" (
    "id" TEXT NOT NULL,
    "role" "ApiTokenType" NOT NULL,
    "email" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "status" "LoginAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LoginAccount_role_emailNormalized_key" ON "LoginAccount"("role", "emailNormalized");
CREATE INDEX "LoginAccount_tenantId_role_status_idx" ON "LoginAccount"("tenantId", "role", "status");
CREATE INDEX "LoginAccount_userId_idx" ON "LoginAccount"("userId");

ALTER TABLE "LoginAccount"
ADD CONSTRAINT "LoginAccount_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LoginAccount"
ADD CONSTRAINT "LoginAccount_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
