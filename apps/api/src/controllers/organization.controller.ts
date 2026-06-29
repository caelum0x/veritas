// Organization controller handlers for CRUD operations
import type { Request, Response, NextFunction } from "express";
import { isErr, type AppError } from "@veritas/core";
import { asyncHandler } from "../http/async-handler.js";
import { respondOk, respondCreated, respondNoContent, respondPage } from "../http/responder.js";
import { toHttpError } from "../http/api-error.js";
import { toPageRequest } from "@veritas/core";
import {
  createOrganizationValidator,
  updateOrganizationValidator,
  listOrganizationsValidator,
} from "../validators/organization.validator.js";

export const listOrganizations = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const parsed = listOrganizationsValidator.shape.query.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters", issues: parsed.error.issues });
    return;
  }
  const svc = req.app.locals.container.organizationService;
  const pageReq = toPageRequest(parsed.data);
  const result = await svc.list(pageReq);
  if (isErr(result)) { const e = toHttpError(result.error as AppError); res.status(e.statusCode).json(e.toBody()); return; }
  respondPage(res, result.value);
});

export const getOrganization = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const { id } = req.params;
  const svc = req.app.locals.container.organizationService;
  const result = await svc.getById(id);
  if (isErr(result)) { const e = toHttpError(result.error as AppError); res.status(e.statusCode).json(e.toBody()); return; }
  respondOk(res, result.value);
});

export const createOrganization = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const parsed = createOrganizationValidator.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
    return;
  }
  const svc = req.app.locals.container.organizationService;
  const result = await svc.create(parsed.data);
  if (isErr(result)) { const e = toHttpError(result.error as AppError); res.status(e.statusCode).json(e.toBody()); return; }
  respondCreated(res, result.value);
});

export const updateOrganization = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const parsed = updateOrganizationValidator.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
    return;
  }
  const { id } = req.params;
  const svc = req.app.locals.container.organizationService;
  const result = await svc.update(id, parsed.data);
  if (isErr(result)) { const e = toHttpError(result.error as AppError); res.status(e.statusCode).json(e.toBody()); return; }
  respondOk(res, result.value);
});

export const deleteOrganization = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const { id } = req.params;
  const svc = req.app.locals.container.organizationService;
  const result = await svc.delete(id);
  if (isErr(result)) { const e = toHttpError(result.error as AppError); res.status(e.statusCode).json(e.toBody()); return; }
  respondNoContent(res);
});

export const getOrganizationMembers = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const { id } = req.params;
  const svc = req.app.locals.container.membershipService;
  const pageReq = toPageRequest(req.query as Record<string, string>);
  const result = await svc.listByOrganization(id, pageReq);
  if (isErr(result)) { const e = toHttpError(result.error as AppError); res.status(e.statusCode).json(e.toBody()); return; }
  respondPage(res, result.value);
});
