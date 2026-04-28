import { Router, Request, Response } from "express";
import { fetchAllTenants, fetchTenantById } from "./service";
import logger from "../logger";

const router = Router();

// GET /tenants/
router.get("/", async (req: Request, res: Response) => {
  try {
    const tenants = await fetchAllTenants();
    logger.info("Fetched all tenants", { count: tenants.length });
    res.json(tenants);
  } catch (error) {
    logger.error("Failed to fetch tenants", { error });
    res.status(500).json({ error: "Failed to fetch Tenants" });
  }
});

// GET /tenants/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const tenant = await fetchTenantById(req.params.id);
    if (!tenant) {
      logger.warn("Tenant not found", { id: req.params.id });
      return res.status(404).json({ error: "Tenant not found" });
    }
    logger.info("Fetched tenant", { id: tenant.id });
    res.json(tenant);
  } catch (error) {
    logger.error("Failed to fetch tenant", { error, id: req.params.id });
    res.status(500).json({ error: "Failed to fetch Tenant" });
  }
});

export default router;
