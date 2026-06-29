// Settlement route definitions: USDC on-chain settlement CRUD and confirmation.
import { Router } from "express";
import {
  createSettlement,
  getSettlement,
  updateSettlement,
  listSettlements,
  confirmSettlement,
} from "../controllers/settlement.controller.js";

const router = Router();

// List all settlements (optionally filtered by orderId/status)
router.get("/", listSettlements);

// Create a new settlement record
router.post("/", createSettlement);

// Get a single settlement by id
router.get("/:id", getSettlement);

// Update settlement metadata or status
router.patch("/:id", updateSettlement);

// Mark a settlement as confirmed with a tx hash
router.post("/:id/confirm", confirmSettlement);

export { router as settlementRouter };
