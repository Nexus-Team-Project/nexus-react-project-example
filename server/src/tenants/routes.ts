// routes/suppliers.ts
import { Router, Request, Response } from "express";
import prisma from "../prisma";

const router = Router();

// GET /tenants/
router.get("/", async (req: Request, res: Response) => {
  try {
    const tenants = await prisma.tenant.findMany();
    res.json(tenants);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch Tenants" });
  }
});

// GET /tenants/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
    });
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });
    res.json(tenant);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch Tenant" });
  }
});

export default router;
