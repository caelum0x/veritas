// Plan route definitions mounting CRUD endpoints under /plans.
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import {
  listPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
} from "../controllers/plan.controller.js";

const router = Router();

router.get("/", rateLimit({ max: 100 }), ...listPlans);
router.get("/:id", rateLimit({ max: 100 }), ...getPlan);
router.post("/", authenticate, rateLimit({ max: 20 }), ...createPlan);
router.patch("/:id", authenticate, rateLimit({ max: 20 }), ...updatePlan);
router.delete("/:id", authenticate, rateLimit({ max: 10 }), ...deletePlan);

export default router;
