// Negotiation route definitions mounting CRUD and lifecycle endpoints.
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { validateBody, validateQuery, validateParams } from "../middleware/validate.js";
import { parsePagination } from "../middleware/pagination.js";
import {
  createNegotiation,
  getNegotiation,
  listNegotiations,
  updateNegotiation,
  cancelNegotiation,
  acceptNegotiation,
  rejectNegotiation,
} from "../controllers/negotiation.controller.js";
import {
  createNegotiationBodySchema,
  updateNegotiationBodySchema,
  listNegotiationsQuerySchema,
  negotiationIdParamSchema,
} from "../validators/negotiation.validator.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  parsePagination,
  validateQuery(listNegotiationsQuerySchema),
  listNegotiations
);

router.post(
  "/",
  validateBody(createNegotiationBodySchema),
  createNegotiation
);

router.get(
  "/:id",
  validateParams(negotiationIdParamSchema),
  getNegotiation
);

router.patch(
  "/:id",
  validateParams(negotiationIdParamSchema),
  validateBody(updateNegotiationBodySchema),
  updateNegotiation
);

router.post(
  "/:id/cancel",
  validateParams(negotiationIdParamSchema),
  cancelNegotiation
);

router.post(
  "/:id/accept",
  validateParams(negotiationIdParamSchema),
  acceptNegotiation
);

router.post(
  "/:id/reject",
  validateParams(negotiationIdParamSchema),
  rejectNegotiation
);

export { router as negotiationRouter };
