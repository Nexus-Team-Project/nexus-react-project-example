/** This file validates bearer tokens against JWT signatures and stored hashes. */
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import type { ApiTokenType } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../shared/errors.js";
import { sha256 } from "../../shared/security.js";
import type { AuthContext } from "./auth.types.js";

interface JwtPayload {
  sub?: string;
  type?: ApiTokenType;
  tenant?: string;
  email?: string;
  scopes?: string[];
}

type JwtExpiresIn = NonNullable<SignOptions["expiresIn"]>;

/** Validates a bearer token and returns its stored authorization context. */
export async function authenticateBearerToken(token: string): Promise<AuthContext> {
  let decoded: JwtPayload;

  try {
    decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    throw new AppError("UNAUTHORIZED", "Bearer token is invalid or expired");
  }

  const tokenHash = sha256(token);
  const storedToken = await prisma.apiToken.findUnique({
    where: { tokenHash },
    include: { tenant: true },
  });

  if (!storedToken || storedToken.revokedAt || (storedToken.expiresAt && storedToken.expiresAt <= new Date())) {
    throw new AppError("UNAUTHORIZED", "Bearer token is not active");
  }

  if (decoded.type !== storedToken.type) {
    throw new AppError("UNAUTHORIZED", "Bearer token type is invalid");
  }

  const scopes = Array.isArray(storedToken.scopes) ? storedToken.scopes.filter((scope): scope is string => typeof scope === "string") : [];

  return {
    tokenId: storedToken.id,
    type: storedToken.type,
    tenantDbId: storedToken.tenantId,
    tenantPublicId: storedToken.tenant?.tenantId ?? null,
    userEmailNormalized: storedToken.userEmailNormalized,
    scopes,
  };
}

/** Signs a JWT for seed scripts and manual local API testing. */
export function signTestToken(payload: JwtPayload, expiresIn: JwtExpiresIn): string {
  return jwt.sign({ ...payload }, env.JWT_SECRET, { expiresIn });
}
