/** This file validates user purchased-offer status route parameters. */
import { z } from "zod";

export const userStatusParamsSchema = z.object({
  tenant: z.string().min(1).max(120),
  userEmail: z.string().email().max(254),
});
