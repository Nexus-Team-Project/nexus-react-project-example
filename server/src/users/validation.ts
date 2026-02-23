import { Request } from "express";
import { z } from "zod";
import { AppError } from "../errors/AppError";

const tenantParamSchema = z.object({
  tenantId: z.string().uuid("Invalid tenant ID format"),
});

export const validateTenantParam = (req: Request) => {
  const result = tenantParamSchema.safeParse(req.params);
  if (!result.success) {
    throw new AppError(400, "INVALID_PARAMETERS", result.error.issues[0].message);
  }
  return result.data;
};
