// API key route definitions: CRUD + revoke endpoints
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import {
  listApiKeysHandler,
  createApiKeyHandler,
  getApiKeyHandler,
  revokeApiKeyHandler,
} from "../controllers/api-key.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", rateLimit({ max: 60, windowMs: 60_000 }), ...listApiKeysHandler);
router.post("/", rateLimit({ max: 20, windowMs: 60_000 }), ...createApiKeyHandler);
router.get("/:id", rateLimit({ max: 60, windowMs: 60_000 }), ...getApiKeyHandler);
router.delete("/:id", rateLimit({ max: 20, windowMs: 60_000 }), ...revokeApiKeyHandler);

export { router as apiKeyRouter };
