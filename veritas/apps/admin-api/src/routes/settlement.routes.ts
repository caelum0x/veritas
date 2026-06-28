// Settlement admin routes — mount under /admin/settlements
import { Router } from "express";
import {
  listSettlements,
  getSettlement,
  updateSettlementStatus,
} from "../controllers/settlement.controller.js";

export function createSettlementRouter(_controller?: unknown): Router {
  const router = Router();

  router.get("/", listSettlements);
  router.get("/:id", getSettlement);
  router.patch("/:id/status", updateSettlementStatus);

  return router;
}
