// Order route definitions: list, create, get, cancel, and status updates
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import {
  listOrdersHandler,
  createOrderHandler,
  getOrderHandler,
  cancelOrderHandler,
} from "../controllers/order.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", rateLimit({ max: 60, windowMs: 60_000 }), ...listOrdersHandler);
router.post("/", rateLimit({ max: 30, windowMs: 60_000 }), ...createOrderHandler);
router.get("/:id", rateLimit({ max: 120, windowMs: 60_000 }), ...getOrderHandler);
router.delete("/:id", rateLimit({ max: 20, windowMs: 60_000 }), ...cancelOrderHandler);

export { router as orderRouter };
