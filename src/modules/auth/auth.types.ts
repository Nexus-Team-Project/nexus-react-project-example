/** This file defines the authenticated request context used by route handlers. */
import type { ApiTokenType } from "@prisma/client";

export interface AuthContext {
  tokenId: string;
  type: ApiTokenType;
  tenantDbId: string | null;
  tenantPublicId: string | null;
  userEmailNormalized: string | null;
  scopes: string[];
}

declare module "fastify" {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}
