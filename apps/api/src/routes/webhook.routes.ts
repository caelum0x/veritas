// Webhook route definitions wiring HTTP methods to controller handlers
import { Router } from "express";
import {
  listWebhooks,
  getWebhook,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  listWebhookDeliveries,
  getWebhookDelivery,
  redeliverWebhook,
} from "../controllers/webhook.controller.js";

const router = Router();

router.get("/", ...listWebhooks);
router.post("/", ...createWebhook);
router.get("/:id", ...getWebhook);
router.patch("/:id", ...updateWebhook);
router.delete("/:id", ...deleteWebhook);
router.get("/:id/deliveries", ...listWebhookDeliveries);
router.get("/:id/deliveries/:deliveryId", ...getWebhookDelivery);
router.post("/:id/deliveries/:deliveryId/redeliver", ...redeliverWebhook);

export { router as webhookRouter };
