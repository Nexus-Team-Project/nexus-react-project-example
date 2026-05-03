/** This file provides reusable Fastify auth and tenant authorization checks. */
import type { FastifyRequest } from "fastify";
import { AppError } from "../../shared/errors.js";
import { authenticateBearerToken } from "./token.service.js";

/** Reads Authorization: Bearer and attaches auth context to the request. */
export async function requireAuth(request: FastifyRequest): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError("UNAUTHORIZED", "Bearer token is required");
  }

  request.auth = await authenticateBearerToken(header.slice("Bearer ".length).trim());
}

/** Requires a partner token and validates access to the requested tenant. */
export function requirePartnerForTenant(request: FastifyRequest, tenantPublicId: string): void {
  if (!request.auth || request.auth.type !== "PARTNER") {
    throw new AppError("UNAUTHORIZED", "Partner bearer token is required");
  }

  if (request.auth.tenantPublicId !== tenantPublicId && !request.auth.scopes.includes("tenant:all")) {
    throw new AppError("FORBIDDEN", "Access to the requested tenant is not allowed");
  }
}

/** Requires a partner or user token that belongs to the requested tenant. */
export function requireAccountForTenant(request: FastifyRequest, tenantPublicId: string): void {
  if (!request.auth) {
    throw new AppError("UNAUTHORIZED", "Bearer token is required");
  }

  if (request.auth.tenantPublicId !== tenantPublicId && !request.auth.scopes.includes("tenant:all")) {
    throw new AppError("FORBIDDEN", "Access to the requested tenant is not allowed");
  }
}

/** Requires a user token that matches the requested user email or has support scope. */
export function requireUserForEmail(request: FastifyRequest, userEmailNormalized: string): void {
  if (!request.auth || request.auth.type !== "USER") {
    throw new AppError("UNAUTHORIZED", "User bearer token is required");
  }

  if (request.auth.userEmailNormalized !== userEmailNormalized && !request.auth.scopes.includes("support:user-status")) {
    throw new AppError("FORBIDDEN", "Access to the requested user is not allowed");
  }
}
