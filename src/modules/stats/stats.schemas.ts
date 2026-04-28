/** This file validates tenant offer statistics parameters and filters. */
import { z } from "zod";

export const statsParamsSchema = z.object({
  tenant: z.string().min(1).max(120),
});

export const statsQuerySchema = z.object({
  tenantId: z.string().min(1).max(120).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  offerId: z.string().min(1).max(120).optional(),
});
