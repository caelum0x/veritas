// Service controller handlers — CRUD for agent-advertised services
import type { Request, Response, NextFunction } from "express";
import { apiSuccess, apiPage, apiFailure, type ErrorCode } from "@veritas/core";
import { asyncHandler } from "../http/async-handler.js";
import { respond } from "../http/responder.js";
import { toHttpError } from "../http/api-error.js";
import {
  createServiceBodySchema,
  updateServiceBodySchema,
  listServicesQuerySchema,
} from "../validators/service.validator.js";

function getServiceService(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const container = (req as any).container;
  return container.serviceService;
}

export const listServices = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const query = listServicesQuerySchema.parse(req.query);
  const svc = getServiceService(req);
  const result = await svc.list({
    page: query.page ?? 1,
    limit: query.limit ?? 20,
    cursor: query.cursor,
    filters: {
      ...(query.agentId ? { agentId: query.agentId } : {}),
      ...(query.active !== undefined ? { active: query.active } : {}),
    },
  });
  if (!result.ok) {
    const err = toHttpError(result.error);
    respond(res, err.statusCode, apiFailure({ code: err.code as ErrorCode, message: err.message }));
    return;
  }
  const page = result.value;
  respond(res, 200, apiPage(page.items, page.meta));
});

export const getService = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const { id } = req.params;
  const svc = getServiceService(req);
  const result = await svc.getById(id);
  if (!result.ok) {
    const err = toHttpError(result.error);
    respond(res, err.statusCode, apiFailure({ code: err.code as ErrorCode, message: err.message }));
    return;
  }
  respond(res, 200, apiSuccess(result.value));
});

export const createService = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const body = createServiceBodySchema.parse(req.body);
  const svc = getServiceService(req);
  const result = await svc.create(body);
  if (!result.ok) {
    const err = toHttpError(result.error);
    respond(res, err.statusCode, apiFailure({ code: err.code as ErrorCode, message: err.message }));
    return;
  }
  respond(res, 201, apiSuccess(result.value));
});

export const updateService = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const { id } = req.params;
  const body = updateServiceBodySchema.parse(req.body);
  const svc = getServiceService(req);
  const result = await svc.update(id, body);
  if (!result.ok) {
    const err = toHttpError(result.error);
    respond(res, err.statusCode, apiFailure({ code: err.code as ErrorCode, message: err.message }));
    return;
  }
  respond(res, 200, apiSuccess(result.value));
});

export const deleteService = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const { id } = req.params;
  const svc = getServiceService(req);
  const result = await svc.delete(id);
  if (!result.ok) {
    const err = toHttpError(result.error);
    respond(res, err.statusCode, apiFailure({ code: err.code as ErrorCode, message: err.message }));
    return;
  }
  respond(res, 204, null);
});
