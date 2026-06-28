// API key admin routes — CRUD + revoke and rotate lifecycle operations
import { Router } from "express";
import { apiKeyController } from "../controllers/api-key.controller.js";

const router = Router();

router.get("/", apiKeyController.listApiKeys);
router.post("/", apiKeyController.createApiKey);
router.get("/:id", apiKeyController.getApiKey);
router.patch("/:id", apiKeyController.updateApiKey);
router.post("/:id/revoke", apiKeyController.revokeApiKey);
router.post("/:id/rotate", apiKeyController.rotateApiKey);

export { router as apiKeyRouter };
