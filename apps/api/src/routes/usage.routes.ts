// Usage route definitions: list records, get a single record, ingest usage, and org summary.
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { parsePagination } from "../middleware/pagination.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";
import {
  listUsage,
  getUsageRecord,
  createUsageRecord,
  getOrgUsageSummary,
} from "../controllers/usage.controller.js";
import {
  createUsageBodySchema,
  listUsageQuerySchema,
  usageIdParamSchema,
} from "../validators/usage.validator.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  parsePagination,
  validateQuery(listUsageQuerySchema),
  listUsage
);

router.post(
  "/",
  validateBody(createUsageBodySchema),
  createUsageRecord
);

router.get(
  "/summary",
  validateQuery(listUsageQuerySchema),
  getOrgUsageSummary
);

router.get(
  "/:id",
  validateParams(usageIdParamSchema),
  getUsageRecord
);

export { router as usageRouter };
