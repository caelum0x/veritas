// Admin controller for permission management operations
import type { Request, Response, NextFunction } from "express";
import { HttpError } from "../http/api-error.js";
import { sendOk, sendCreated, sendNoContent, sendPage, sendError } from "../http/responder.js";
import {
  listPermissionsSchema,
  getPermissionSchema,
  createPermissionSchema,
  updatePermissionSchema,
  deletePermissionSchema,
  assignPermissionToRoleSchema,
} from "../validators/permission.validator.js";

interface PermissionRecord {
  id: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionService {
  listPermissions(opts: unknown): Promise<{ data: PermissionRecord[]; total: number; page: number; limit: number }>;
  getPermissionById(id: string): Promise<PermissionRecord | null>;
  createPermission(data: unknown): Promise<PermissionRecord>;
  updatePermission(id: string, data: unknown): Promise<PermissionRecord | null>;
  deletePermission(id: string): Promise<boolean>;
  assignPermissionToRole(permissionId: string, roleId: string): Promise<void>;
}

function getPermissionService(req: Request): PermissionService {
  const svc = (req as unknown as Record<string, unknown>)["permissionService"];
  if (!svc) {
    throw new HttpError(503, "UNAVAILABLE", "Permission service not available");
  }
  return svc as PermissionService;
}

export async function listPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = listPermissionsSchema.safeParse({ query: req.query });
    if (!parsed.success) {
      sendError(res, 422, "VALIDATION", "Invalid query parameters", { issues: parsed.error.issues });
      return;
    }
    const svc = getPermissionService(req);
    const result = await svc.listPermissions(parsed.data.query);
    sendPage(res, result.data, { total: result.total, nextCursor: null, hasMore: false });
  } catch (err) {
    next(err);
  }
}

export async function getPermission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = getPermissionSchema.safeParse({ params: req.params });
    if (!parsed.success) {
      sendError(res, 422, "VALIDATION", "Invalid parameters", { issues: parsed.error.issues });
      return;
    }
    const svc = getPermissionService(req);
    const permission = await svc.getPermissionById(parsed.data.params.id);
    if (!permission) {
      sendError(res, 404, "NOT_FOUND", `Permission ${parsed.data.params.id} not found`);
      return;
    }
    sendOk(res, permission);
  } catch (err) {
    next(err);
  }
}

export async function createPermission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createPermissionSchema.safeParse({ body: req.body });
    if (!parsed.success) {
      sendError(res, 422, "VALIDATION", "Invalid request body", { issues: parsed.error.issues });
      return;
    }
    const svc = getPermissionService(req);
    const permission = await svc.createPermission(parsed.data.body);
    sendCreated(res, permission);
  } catch (err) {
    next(err);
  }
}

export async function updatePermission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = updatePermissionSchema.safeParse({ params: req.params, body: req.body });
    if (!parsed.success) {
      sendError(res, 422, "VALIDATION", "Invalid request", { issues: parsed.error.issues });
      return;
    }
    const svc = getPermissionService(req);
    const permission = await svc.updatePermission(parsed.data.params.id, parsed.data.body);
    if (!permission) {
      sendError(res, 404, "NOT_FOUND", `Permission ${parsed.data.params.id} not found`);
      return;
    }
    sendOk(res, permission);
  } catch (err) {
    next(err);
  }
}

export async function deletePermission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = deletePermissionSchema.safeParse({ params: req.params });
    if (!parsed.success) {
      sendError(res, 422, "VALIDATION", "Invalid parameters", { issues: parsed.error.issues });
      return;
    }
    const svc = getPermissionService(req);
    const deleted = await svc.deletePermission(parsed.data.params.id);
    if (!deleted) {
      sendError(res, 404, "NOT_FOUND", `Permission ${parsed.data.params.id} not found`);
      return;
    }
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
}

export function makePermissionController(_permissionService: PermissionService) {
  return {
    listPermissions,
    getPermission,
    createPermission,
    updatePermission,
    deletePermission,
    assignPermissionToRole,
  };
}

export async function assignPermissionToRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = assignPermissionToRoleSchema.safeParse({ params: req.params, body: req.body });
    if (!parsed.success) {
      sendError(res, 422, "VALIDATION", "Invalid request", { issues: parsed.error.issues });
      return;
    }
    const svc = getPermissionService(req);
    await svc.assignPermissionToRole(parsed.data.params.id, parsed.data.body.roleId);
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
}
