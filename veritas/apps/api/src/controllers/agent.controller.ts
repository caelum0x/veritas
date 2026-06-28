// Agent controller handlers — CRUD for registered CAP agents
import type { Request, Response, NextFunction } from "express";
import { apiSuccess, apiPage, apiFailure } from "@veritas/core";
import { asyncHandler } from "../http/async-handler.js";
import { respond } from "../http/responder.js";
import { toHttpError } from "../http/api-error.js";
import {
  createAgentBodySchema,
  updateAgentBodySchema,
  listAgentsQuerySchema,
} from "../validators/agent.validator.js";

function getAgentService(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const container = (req as any).container;
  return container.agentService;
}

export const listAgents = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const query = listAgentsQuerySchema.parse(req.query);
  const svc = getAgentService(req);
  const result = await svc.list({
    page: query.page ?? 1,
    limit: query.limit ?? 20,
    cursor: query.cursor,
    filters: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
    },
  });
  if (!result.ok) {
    const err = toHttpError(result.error);
    respond(res, err.statusCode, apiFailure({ code: err.code as import("@veritas/core").ErrorCode, message: err.message }));
    return;
  }
  const page = result.value;
  respond(res, 200, apiPage(page.items, page.meta));
});

export const getAgent = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const { id } = req.params;
  const svc = getAgentService(req);
  const result = await svc.getById(id);
  if (!result.ok) {
    const err = toHttpError(result.error);
    respond(res, err.statusCode, apiFailure({ code: err.code as import("@veritas/core").ErrorCode, message: err.message }));
    return;
  }
  respond(res, 200, apiSuccess(result.value));
});

export const createAgent = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const body = createAgentBodySchema.parse(req.body);
  const svc = getAgentService(req);
  const result = await svc.create(body);
  if (!result.ok) {
    const err = toHttpError(result.error);
    respond(res, err.statusCode, apiFailure({ code: err.code as import("@veritas/core").ErrorCode, message: err.message }));
    return;
  }
  respond(res, 201, apiSuccess(result.value));
});

export const updateAgent = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const { id } = req.params;
  const body = updateAgentBodySchema.parse(req.body);
  const svc = getAgentService(req);
  const result = await svc.update(id, body);
  if (!result.ok) {
    const err = toHttpError(result.error);
    respond(res, err.statusCode, apiFailure({ code: err.code as import("@veritas/core").ErrorCode, message: err.message }));
    return;
  }
  respond(res, 200, apiSuccess(result.value));
});

export const deleteAgent = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const { id } = req.params;
  const svc = getAgentService(req);
  const result = await svc.delete(id);
  if (!result.ok) {
    const err = toHttpError(result.error);
    respond(res, err.statusCode, apiFailure({ code: err.code as import("@veritas/core").ErrorCode, message: err.message }));
    return;
  }
  respond(res, 204, null);
});
