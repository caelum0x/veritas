// Agent admin routes — CRUD + activate/deactivate lifecycle
import { Router } from "express";
import {
  listAgents,
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent,
  activateAgent,
  deactivateAgent,
} from "../controllers/agent.controller.js";

export function createAgentRouter(): Router {
  const router = Router();

  router.get("/", listAgents);
  router.post("/", createAgent);
  router.get("/:agentId", getAgent);
  router.patch("/:agentId", updateAgent);
  router.delete("/:agentId", deleteAgent);
  router.post("/:agentId/activate", activateAgent);
  router.post("/:agentId/deactivate", deactivateAgent);

  return router;
}
