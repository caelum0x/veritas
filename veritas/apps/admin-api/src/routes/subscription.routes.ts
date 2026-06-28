// Subscription admin routes — CRUD + lifecycle (cancel, reactivate)
import { Router } from "express";
import { subscriptionController } from "../controllers/subscription.controller.js";

const router = Router();

router.get("/", subscriptionController.listSubscriptions);
router.post("/", subscriptionController.createSubscription);
router.get("/:id", subscriptionController.getSubscription);
router.patch("/:id", subscriptionController.updateSubscription);
router.post("/:id/cancel", subscriptionController.cancelSubscription);
router.post("/:id/reactivate", subscriptionController.reactivateSubscription);

export { router as subscriptionRouter };
