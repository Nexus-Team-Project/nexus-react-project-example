/** This file defines API errors and response helpers used by every route. */
import type { FastifyReply } from "fastify";
import { ZodError } from "zod";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "PAYMENT_PROVIDER_ERROR"
  | "INTERNAL_ERROR";

const statusByCode = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  PAYMENT_PROVIDER_ERROR: 502,
  INTERNAL_ERROR: 500,
} satisfies Record<ApiErrorCode, number>;

/** AppError carries a safe API error code and message for clients. */
export class AppError extends Error {
  public readonly code: ApiErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  /** Creates an application error that can be safely returned as JSON. */
  public constructor(code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.statusCode = statusByCode[code];
    this.details = details;
  }
}

/** Sends one consistent JSON error shape to API clients. */
export function sendApiError(reply: FastifyReply, error: AppError): FastifyReply {
  const body = error.details === undefined
    ? { errorCode: error.code, message: error.message }
    : { errorCode: error.code, message: error.message, details: error.details };

  return reply.status(error.statusCode).send(body);
}

/** Converts unknown thrown values into a safe AppError. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new AppError("VALIDATION_ERROR", "Request validation failed", error.flatten());
  }

  if (isFastifyClientError(error)) {
    return new AppError("BAD_REQUEST", error.message);
  }

  return new AppError("INTERNAL_ERROR", "An unexpected server error occurred");
}

/** Detects Fastify request parsing errors that are safe to return as client mistakes. */
function isFastifyClientError(error: unknown): error is { message: string; statusCode: number } {
  return (
    typeof error === "object"
    && error !== null
    && "message" in error
    && "statusCode" in error
    && typeof error.message === "string"
    && typeof error.statusCode === "number"
    && error.statusCode >= 400
    && error.statusCode < 500
  );
}
