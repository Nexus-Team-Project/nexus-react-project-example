/** This file validates login and logout API request bodies. */
import { z } from "zod";

/** Validates the role, email, and password used to create a demo session token. */
export const loginRequestSchema = z.object({
  role: z.enum(["PARTNER", "USER"]),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(200),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
