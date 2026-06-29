// Agent HTTP controllers: validate requests, call service functions, map to responses.
import type { Request, Response, NextFunction } from "express";
import { isErr } from "@veritas/core";
import { asyncHandler } from "../../http/async-handler.js";
import { respondOk, respondCreated, respondNoContent, respondError } from "../../http/responder.js";
import { toHttpError } from "../../http/api-error.js";
import { validateBody, validateQuery, validateParams } from "../../middleware/validate.js";
import type { AuthenticatedRequest } from "../../middleware/auth.js";
import {
  createAgentBodySchema,
  updateAgentBodySchema,
  listAgentsQuerySchema,
  agentIdParamSchema,
  setTrustBodySchema,
} from "./agents.schema.js";
import {
  registerAgent,
  getAgentById,
  listAgents,
  updateAgent,
  setAgentTrust,
  deleteAgent,
  type AgentsDeps,
} from "./agents.service.js";
import { toAgentResponse, toAgentListResponse } from "./agents.mapper.js";

type AuthReq = AuthenticatedRequest;

function handleErr(res: Response, error: unknown): void {
  const httpErr = toHttpError(error as import("@veritas/core").AppError);
  respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
}

/** POST /agents — register a new CAP agent. */
export function makeRegisterAgentHandler(deps: AgentsDeps) {
  return [
    validateBody(createAgentBodySchema),
    asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
      const result = await registerAgent(deps, req as AuthReq, req.body as import("@veritas/services").RegisterAgentInput);
      if (isErr(result)) return handleErr(res, result.error);
      return respondCreated(res, toAgentResponse(result.value));
    }),
  ];
}

/** GET /agents — list agents with optional filters. */
export function makeListAgentsHandler(deps: AgentsDeps) {
  return [
    validateQuery(listAgentsQuerySchema),
    asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
      const query = req.query as import("./agents.schema.js").ListAgentsQuery;
      const result = await listAgents(deps, req as AuthReq, {
        trusted: query.trusted,
        walletAddress: query.walletAddress,
        limit: query.limit,
        cursor: query.cursor,
      });
      if (isErr(result)) return handleErr(res, result.error);
      return respondOk(res, toAgentListResponse(result.value));
    }),
  ];
}

/** GET /agents/:id — get a single agent by ID. */
export function makeGetAgentHandler(deps: AgentsDeps) {
  return [
    validateParams(agentIdParamSchema),
    asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
      const { id } = req.params as { id: string };
      const result = await getAgentById(deps, req as AuthReq, id);
      if (isErr(result)) return handleErr(res, result.error);
      return respondOk(res, toAgentResponse(result.value));
    }),
  ];
}

/** PATCH /agents/:id — update mutable fields of an existing agent. */
export function makeUpdateAgentHandler(deps: AgentsDeps) {
  return [
    validateParams(agentIdParamSchema),
    validateBody(updateAgentBodySchema),
    asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
      const { id } = req.params as { id: string };
      const result = await updateAgent(deps, req as AuthReq, id, req.body as import("@veritas/services").UpdateAgentInput);
      if (isErr(result)) return handleErr(res, result.error);
      return respondOk(res, toAgentResponse(result.value));
    }),
  ];
}

/** PUT /agents/:id/trust — set the trusted flag on an agent. */
export function makeSetTrustHandler(deps: AgentsDeps) {
  return [
    validateParams(agentIdParamSchema),
    validateBody(setTrustBodySchema),
    asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
      const { id } = req.params as { id: string };
      const { trusted } = req.body as import("./agents.schema.js").SetTrustBody;
      const result = await setAgentTrust(deps, req as AuthReq, { agentId: id, trusted });
      if (isErr(result)) return handleErr(res, result.error);
      return respondOk(res, toAgentResponse(result.value));
    }),
  ];
}

/** DELETE /agents/:id — remove an agent registration. */
export function makeDeleteAgentHandler(deps: AgentsDeps) {
  return [
    validateParams(agentIdParamSchema),
    asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
      const { id } = req.params as { id: string };
      const result = await deleteAgent(deps, req as AuthReq, id);
      if (isErr(result)) return handleErr(res, result.error);
      return respondNoContent(res);
    }),
  ];
}
