/** This file validates required environment variables before the API starts. */
import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  PARTNER_API_TOKEN_HASH: z.string().min(1),
  ALLOW_PARTNER_STATUS_READS: z.coerce.boolean().default(false),
  PAYME_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  PAYME_API_KEY: z.string().min(1),
  PAYME_BASE_URL: z.string().min(1),
  PAYME_SELLER_ID: z.string().min(1),
  PAYME_WEBHOOK_SECRET: z.string().min(1),
  PUBLIC_API_BASE_URL: z.string().url(),
  PAYMENT_SUCCESS_URL: z.string().url(),
  PAYMENT_FAILURE_URL: z.string().url(),
});

export type Env = z.infer<typeof envSchema>;

/** Reads and validates process.env, failing fast when required config is missing. */
export function loadEnv(): Env {
  return envSchema.parse(process.env);
}

export const env = loadEnv();
