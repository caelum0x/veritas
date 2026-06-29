// Service admin routes — CRUD for agent-published services
import { Router } from "express";
import {
  listServices,
  getService,
  createService,
  updateService,
  deleteService,
} from "../controllers/service.controller.js";

const router = Router();

router.get("/", listServices);
router.post("/", createService);
router.get("/:id", getService);
router.patch("/:id", updateService);
router.delete("/:id", deleteService);

export { router as serviceRouter };
