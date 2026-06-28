// Subscription route definitions mounting CRUD and lifecycle endpoints under /subscriptions.
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import {
  listSubscriptions,
  getSubscription,
  createSubscription,
  updateSubscription,
  cancelSubscription,
} from "../controllers/subscription.controller.js";

const router = Router();

router.get("/", authenticate, rateLimit({ max: 100 }), ...listSubscriptions);
router.get("/:id", authenticate, rateLimit({ max: 100 }), ...getSubscription);
router.post("/", authenticate, rateLimit({ max: 10 }), ...createSubscription);
router.patch("/:id", authenticate, rateLimit({ max: 20 }), ...updateSubscription);
router.post("/:id/cancel", authenticate, rateLimit({ max: 10 }), ...cancelSubscription);

export default router;
