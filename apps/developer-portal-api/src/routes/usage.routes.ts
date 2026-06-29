// Usage routes — mounts usage summary, time-series, and quota endpoints behind auth
import { Router } from "express";
import { requirePortalAuth } from "../middleware/auth.js";
import {
  getUsageSummary,
  getUsageTimeSeries,
  getQuotaView,
} from "../controllers/usage.controller.js";

const router = Router();

router.use(requirePortalAuth);

/** GET /usage — aggregated usage summary for an app and time period */
router.get("/", getUsageSummary);

/** GET /usage/timeseries — request-count time-series points */
router.get("/timeseries", getUsageTimeSeries);

/** GET /usage/quota — current quota consumption and limits */
router.get("/quota", getQuotaView);

export { router as usageRouter };
