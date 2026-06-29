// Plan admin routes — CRUD + subscription listing for billing plans
import { Router } from "express";
import {
  listPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
  listPlanSubscriptions,
} from "../controllers/plan.controller.js";

const router = Router();

router.get("/", listPlans);
router.post("/", createPlan);
router.get("/:id", getPlan);
router.patch("/:id", updatePlan);
router.delete("/:id", deletePlan);
router.get("/:id/subscriptions", listPlanSubscriptions);

export { router as planRouter };
