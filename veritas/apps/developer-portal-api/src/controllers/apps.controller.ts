// Apps controller — CRUD + lifecycle handlers for developer applications
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { isErr } from "@veritas/core";
import {
  CreateDeveloperAppSchema,
  UpdateDeveloperAppSchema,
  type PortalService,
} from "@veritas/developer-portal";
import type { PortalAuthRequest } from "../middleware/auth.js";

function getService(req: Request): PortalService {
  return (req as unknown as Record<string, unknown>)["portalService"] as PortalService;
}

function getOrgId(req: Request): string {
  return ((req as PortalAuthRequest).orgId ?? "");
}

function sendResult<T>(res: Response, next: NextFunction, result: import("@veritas/core").Result<T>, status = 200): void {
  if (isErr(result)) { next(result.error); return; }
  res.status(status).json({ success: true, data: result.value });
}

const idParamSchema = z.object({ id: z.string().min(1) });

export async function listApps(req: Request, res: Response, next: NextFunction): Promise<void> {
  const svc = getService(req);
  const orgId = getOrgId(req);
  const result = await svc.listApps(orgId);
  sendResult(res, next, result);
}

export async function createApp(req: Request, res: Response, next: NextFunction): Promise<void> {
  const parsed = CreateDeveloperAppSchema.safeParse(req.body);
  if (!parsed.success) { next(new Error(parsed.error.message)); return; }
  const svc = getService(req);
  const result = await svc.createApp(parsed.data);
  sendResult(res, next, result, 201);
}

export async function getApp(req: Request, res: Response, next: NextFunction): Promise<void> {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) { next(new Error(parsed.error.message)); return; }
  const svc = getService(req);
  const result = await svc.getApp(parsed.data.id);
  sendResult(res, next, result);
}

export async function updateApp(req: Request, res: Response, next: NextFunction): Promise<void> {
  const paramParsed = idParamSchema.safeParse(req.params);
  if (!paramParsed.success) { next(new Error(paramParsed.error.message)); return; }
  const bodyParsed = UpdateDeveloperAppSchema.safeParse(req.body);
  if (!bodyParsed.success) { next(new Error(bodyParsed.error.message)); return; }
  const svc = getService(req);
  const result = await svc.updateApp(paramParsed.data.id, bodyParsed.data);
  sendResult(res, next, result);
}

export async function suspendApp(req: Request, res: Response, next: NextFunction): Promise<void> {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) { next(new Error(parsed.error.message)); return; }
  const svc = getService(req);
  const result = await svc.suspendApp(parsed.data.id);
  sendResult(res, next, result);
}

export async function activateApp(req: Request, res: Response, next: NextFunction): Promise<void> {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) { next(new Error(parsed.error.message)); return; }
  const svc = getService(req);
  const result = await svc.activateApp(parsed.data.id);
  sendResult(res, next, result);
}

export async function deleteApp(req: Request, res: Response, next: NextFunction): Promise<void> {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) { next(new Error(parsed.error.message)); return; }
  const svc = getService(req);
  const result = await svc.deleteApp(parsed.data.id);
  sendResult(res, next, result);
}

/** Class-based facade over the standalone handler functions for use in route files. */
export class AppsController {
  constructor(private readonly _service: PortalService) {}

  list(req: Request, res: Response, next: NextFunction): Promise<void> {
    return listApps(req, res, next);
  }

  create(req: Request, res: Response, next: NextFunction): Promise<void> {
    return createApp(req, res, next);
  }

  get(req: Request, res: Response, next: NextFunction): Promise<void> {
    return getApp(req, res, next);
  }

  update(req: Request, res: Response, next: NextFunction): Promise<void> {
    return updateApp(req, res, next);
  }

  suspend(req: Request, res: Response, next: NextFunction): Promise<void> {
    return suspendApp(req, res, next);
  }

  activate(req: Request, res: Response, next: NextFunction): Promise<void> {
    return activateApp(req, res, next);
  }

  delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    return deleteApp(req, res, next);
  }
}
