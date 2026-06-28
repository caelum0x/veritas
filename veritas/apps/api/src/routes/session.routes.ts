// Session route definitions — create, get, and revoke sessions
import { Router } from "express";
import {
  createSession,
  getSession,
  deleteSession,
  listSessions,
} from "../controllers/session.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", createSession);
router.get("/", requireAuth, listSessions);
router.get("/:id", requireAuth, getSession);
router.delete("/:id", requireAuth, deleteSession);

export { router as sessionRouter };
