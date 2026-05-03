/** This file creates and revokes bearer tokens for demo login sessions. */
import type { ApiTokenType } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../shared/errors.js";
import { normalizeEmail } from "../../shared/strings.js";
import { sha256, verifyPassword } from "../../shared/security.js";
import { signTestToken } from "./token.service.js";
import type { LoginRequest } from "./auth.schemas.js";

interface LoginResponse {
  token: string;
  tokenType: "Bearer";
  expiresAt: string;
  account: {
    role: ApiTokenType;
    email: string;
    tenantId: string;
    displayName: string;
  };
}

/** Validates credentials and stores a new hashed bearer token for API access. */
export async function login(input: LoginRequest): Promise<LoginResponse> {
  const emailNormalized = normalizeEmail(input.email);
  const account = await prisma.loginAccount.findUnique({
    where: { role_emailNormalized: { role: input.role, emailNormalized } },
    include: { tenant: true, user: true },
  });

  if (!account || account.status !== "ACTIVE" || account.tenant.status !== "ACTIVE") {
    throw new AppError("UNAUTHORIZED", "Email or password is invalid");
  }

  if (account.role === "USER" && (!account.user || account.user.status !== "ACTIVE")) {
    throw new AppError("UNAUTHORIZED", "Email or password is invalid");
  }

  const passwordIsValid = await verifyPassword(input.password, account.passwordHash);
  if (!passwordIsValid) {
    throw new AppError("UNAUTHORIZED", "Email or password is invalid");
  }

  const expiresAt = getSessionExpiry(account.role);
  const scopes = getScopesForRole(account.role);
  const token = signTestToken({
    sub: account.role === "PARTNER" ? `${account.tenant.tenantId}-partner` : account.emailNormalized,
    type: account.role,
    tenant: account.tenant.tenantId,
    ...(account.role === "USER" ? { email: account.emailNormalized } : {}),
    scopes,
  }, Math.max(Math.floor((expiresAt.getTime() - Date.now()) / 1000), 60));

  await prisma.apiToken.create({
    data: {
      tokenHash: sha256(token),
      type: account.role,
      tenantId: account.tenantId,
      ...(account.role === "USER" ? { userEmail: account.email, userEmailNormalized: account.emailNormalized } : {}),
      scopes,
      expiresAt,
    },
  });

  return {
    token,
    tokenType: "Bearer",
    expiresAt: expiresAt.toISOString(),
    account: {
      role: account.role,
      email: account.email,
      tenantId: account.tenant.tenantId,
      displayName: account.role === "PARTNER" ? account.tenant.name : account.user?.fullName ?? account.email,
    },
  };
}

/** Revokes the current bearer token so it cannot be reused after logout. */
export async function logout(tokenId: string): Promise<{ status: "ok" }> {
  await prisma.apiToken.updateMany({
    where: { id: tokenId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return { status: "ok" };
}

/** Returns the allowed API scopes for the selected account role. */
function getScopesForRole(role: ApiTokenType): string[] {
  if (role === "PARTNER") {
    return ["offers:read", "stats:read"];
  }

  return ["offers:read", "purchase:create", "status:read"];
}

/** Returns the demo session expiry window for partner and user logins. */
function getSessionExpiry(role: ApiTokenType): Date {
  const days = role === "PARTNER" ? 30 : 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
