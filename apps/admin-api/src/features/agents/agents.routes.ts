// Agents routes: wires controllers and validation middleware, exports registerAgentsRoutes.
import type { Router } from "express";
import type { Deps } from "../../container.js";
import { asyncHandler } from "../../http/async-handler.js";
import { validateRequest } from "../../middleware/validate.js";
import { AgentsFeatureService } from "./agents.service.js";
import { AgentsController } from "./agents.controller.js";
import {
  RegisterAgentBodySchema,
  UpdateAgentBodySchema,
  SetAgentTrustBodySchema,
  AgentIdParamSchema,
  ListAgentsQuerySchema,
} from "./agents.schema.js";

export function registerAgentsRoutes(router: Router, deps: Deps): void {
  const svc = new AgentsFeatureService(deps);
  const ctrl = new AgentsController(svc);

  // POST /agents — register a new CAP agent
  router.post(
    "/agents",
    validateRequest(RegisterAgentBodySchema, "body"),
    asyncHandler(ctrl.register.bind(ctrl)),
  );

  // GET /agents — list agents with optional filters
  router.get(
    "/agents",
    validateRequest(ListAgentsQuerySchema, "query"),
    asyncHandler(ctrl.list.bind(ctrl)),
  );

  // GET /agents/:agentId — fetch single agent
  router.get(
    "/agents/:agentId",
    validateRequest(AgentIdParamSchema, "params"),
    asyncHandler(ctrl.getById.bind(ctrl)),
  );

  // PATCH /agents/:agentId — partial update
  router.patch(
    "/agents/:agentId",
    validateRequest(UpdateAgentBodySchema, "body"),
    asyncHandler(ctrl.update.bind(ctrl)),
  );

  // PUT /agents/:agentId/trust — set trusted flag
  router.put(
    "/agents/:agentId/trust",
    validateRequest(SetAgentTrustBodySchema, "body"),
    asyncHandler(ctrl.setTrust.bind(ctrl)),
  );

  // DELETE /agents/:agentId — remove agent registration
  router.delete(
    "/agents/:agentId",
    validateRequest(AgentIdParamSchema, "params"),
    asyncHandler(ctrl.delete.bind(ctrl)),
  );
}
