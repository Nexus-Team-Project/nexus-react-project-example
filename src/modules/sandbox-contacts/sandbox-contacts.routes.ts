/**
 * This file registers the Contacts API sandbox under /api/v1/integrations -
 * the docs site's "Try it out" for the real Nexus Contacts API. Same paths,
 * request bodies and response shapes as the real API ({ error, code } errors).
 * Auth: any Bearer nxk_test_sandbox_<random> key = its own private space.
 * Limits: 30 calls/min per key (5 for bulk calls), 10 new keys/hour per IP.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import {
  bulkBodySchema,
  bulkDeleteBodySchema,
  contactIdParamsSchema,
  contactsQuerySchema,
  deleteAllBodySchema,
  deleteQuerySchema,
} from "./sandbox-contacts.schemas.js";
import { readSandboxKey, resolveSpaceId, SandboxApiError } from "./sandbox-contacts.space.js";
import { findContact, upsertContacts } from "./sandbox-contacts.service.js";
import { deleteAllContacts, deleteContacts, listContacts } from "./sandbox-contacts.list-delete.js";

const NOT_FOUND = { error: "contact_not_found", code: "contact_not_found" };

/** Per-key rate limit config for one route (keyed by the sandbox key, else the IP). */
function limit(max: number) {
  return {
    rateLimit: {
      max,
      timeWindow: "1 minute",
      keyGenerator: (request: FastifyRequest) => readSandboxKey(request.headers.authorization) ?? request.ip,
      errorResponseBuilder: () => ({ statusCode: 429, error: "rate_limited", code: "rate_limited", message: "rate_limited" }),
    },
  };
}

/** The visitor's space for this request. */
const space = (request: FastifyRequest) => resolveSpaceId(request.headers.authorization, request.ip);

/** Single create: 201 created / 200 merged / 400 with the failed row. */
async function createOne(request: FastifyRequest, reply: FastifyReply) {
  const out = await upsertContacts(await space(request), [request.body]);
  const result = out.results[0]!;
  if (result.status === "failed") return reply.status(400).send({ result, error: result.error, code: result.error });
  const contact = await findContact(await space(request), { id: result.tenantContactId! });
  return reply.status(result.status === "created" ? 201 : 200).send({ result, contact, joinRequestsApproved: 0 });
}

/** Single delete by id or externalId: 200 / 404. */
async function deleteOne(request: FastifyRequest, reply: FastifyReply, item: { tenantContactId: string } | { externalId: string }) {
  const out = await deleteContacts(await space(request), [item]);
  const result = out.results[0]!;
  if (result.status === "not_found") return reply.status(404).send(NOT_FOUND);
  return reply.send({ result });
}

/** Adds the sandbox routes in their own scope (own error format + body limit). */
export async function registerSandboxContactsRoutes(app: FastifyInstance): Promise<void> {
  await app.register(async (scope) => {
    scope.setErrorHandler((error, _request, reply) => {
      if (error instanceof SandboxApiError) return reply.status(error.statusCode).send({ error: error.message, code: error.code });
      if (error instanceof ZodError) {
        return reply.status(400).send({ error: error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ") });
      }
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 429) return reply.status(429).send({ error: "rate_limited", code: "rate_limited" });
      if (status && status >= 400 && status < 500) return reply.status(status).send({ error: (error as Error).message || "bad_request" });
      scope.log.error({ error }, "Contacts sandbox request failed");
      return reply.status(500).send({ error: "internal_error", code: "internal_error" });
    });

    scope.post("/contacts", { config: limit(30) }, createOne);

    scope.post("/contacts/bulk", { config: limit(5), bodyLimit: 2 * 1024 * 1024 }, async (request) => {
      const { contacts } = bulkBodySchema.parse(request.body);
      const { columns: _columns, ...out } = await upsertContacts(await space(request), contacts);
      return out;
    });

    scope.get("/contacts/:tenantContactId", { config: limit(30) }, async (request, reply) => {
      const { tenantContactId } = contactIdParamsSchema.parse(request.params);
      const contact = await findContact(await space(request), { id: tenantContactId });
      return contact ? { contact } : reply.status(404).send(NOT_FOUND);
    });

    scope.get("/contacts", { config: limit(30) }, async (request, reply) => {
      const q = contactsQuerySchema.parse(request.query);
      const spaceId = await space(request);
      if (q.externalId || q.email || q.phone) {
        const by = q.externalId ? { externalId: q.externalId } : q.email ? { email: q.email } : { phone: q.phone! };
        const contact = await findContact(spaceId, by);
        return contact ? { contact } : reply.status(404).send(NOT_FOUND);
      }
      return listContacts(spaceId, q.limit, q.cursor);
    });

    scope.delete("/contacts/:tenantContactId", { config: limit(30) }, async (request, reply) => {
      const { tenantContactId } = contactIdParamsSchema.parse(request.params);
      return deleteOne(request, reply, { tenantContactId });
    });

    scope.delete("/contacts", { config: limit(30) }, async (request, reply) => {
      const { externalId } = deleteQuerySchema.parse(request.query);
      return deleteOne(request, reply, { externalId });
    });

    scope.post("/contacts/bulk-delete", { config: limit(5), bodyLimit: 2 * 1024 * 1024 }, async (request) => {
      const { items } = bulkDeleteBodySchema.parse(request.body);
      return deleteContacts(await space(request), items);
    });

    scope.post("/contacts/delete-all", { config: limit(5) }, async (request) => {
      const { dryRun } = deleteAllBodySchema.parse(request.body);
      return deleteAllContacts(await space(request), dryRun);
    });
  }, { prefix: "/api/v1/integrations" });
}
