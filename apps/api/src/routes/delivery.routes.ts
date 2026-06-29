// Delivery route definitions mounting CRUD and status-transition endpoints.
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { validateBody, validateQuery, validateParams } from "../middleware/validate.js";
import { parsePagination } from "../middleware/pagination.js";
import {
  createDelivery,
  getDelivery,
  listDeliveries,
  updateDelivery,
  confirmDelivery,
  disputeDelivery,
} from "../controllers/delivery.controller.js";
import {
  createDeliveryBodySchema,
  updateDeliveryBodySchema,
  listDeliveriesQuerySchema,
  deliveryIdParamSchema,
} from "../validators/delivery.validator.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  parsePagination,
  validateQuery(listDeliveriesQuerySchema),
  listDeliveries
);

router.post(
  "/",
  validateBody(createDeliveryBodySchema),
  createDelivery
);

router.get(
  "/:id",
  validateParams(deliveryIdParamSchema),
  getDelivery
);

router.patch(
  "/:id",
  validateParams(deliveryIdParamSchema),
  validateBody(updateDeliveryBodySchema),
  updateDelivery
);

router.post(
  "/:id/confirm",
  validateParams(deliveryIdParamSchema),
  confirmDelivery
);

router.post(
  "/:id/dispute",
  validateParams(deliveryIdParamSchema),
  disputeDelivery
);

export { router as deliveryRouter };
