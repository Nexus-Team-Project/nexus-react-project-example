import { Router, Request, Response } from "express";
import { fetchAllUsers, fetchUsersByTenant } from "./service";
import { validateTenantParam } from "./validation";
import logger from "../logger";

const router = Router();

// GET /users
router.get("/", async (req: Request, res: Response) => {
  try {
    const users = await fetchAllUsers();
    logger.info("Fetched all users", { count: users.length });
    res.json(users);
  } catch (error) {
    logger.error("Failed to fetch users", { error });
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// GET /users/tenant/:tenantId
router.get("/tenant/:tenantId", async (req: Request, res: Response) => {
  try {
    const { tenantId } = validateTenantParam(req);
    const users = await fetchUsersByTenant(tenantId);
    logger.info("Fetched users by tenant", { tenantId, count: users.length });
    res.json(users);
  } catch (error) {
    logger.error("Failed to fetch users for tenant", { error, tenantId: req.params.tenantId });
    res.status(500).json({ error: "Failed to fetch users for tenant" });
  }
});

export default router;
