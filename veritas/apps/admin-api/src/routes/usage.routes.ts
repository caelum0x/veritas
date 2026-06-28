// Usage admin routes — read-only usage metrics and aggregations
import { Router } from "express";
import {
  listUsage,
  getUsageRecord,
  listUsageByOrganization,
  listUsageByService,
} from "../controllers/usage.controller.js";

const router = Router();

router.get("/", listUsage);
router.get("/:id", getUsageRecord);
router.get("/organizations/:orgId", listUsageByOrganization);
router.get("/services/:serviceId", listUsageByService);

export { router as usageRouter };
