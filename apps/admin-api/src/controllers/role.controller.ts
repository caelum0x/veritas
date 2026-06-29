// Role admin controller — CRUD + permission assignment for roles
import type { Request, Response, NextFunction } from "express";
import { ConflictError } from "@veritas/core";
import { sendOk, sendCreated, sendNoContent, sendPage } from "../http/responder.js";
import { HttpError } from "../http/api-error.js";
import type {
  ListRolesInput,
  GetRoleInput,
  CreateRoleInput,
  UpdateRoleInput,
  DeleteRoleInput,
  AssignPermissionsInput,
  RevokePermissionsInput,
} from "../validators/role.validator.js";

export interface RoleService {
  listRoles(params: {
    page: number;
    limit: number;
    search?: string;
    organizationId?: string;
  }): Promise<{ items: unknown[]; total: number; page: number; limit: number }>;
  getRoleById(id: string): Promise<unknown | null>;
  createRole(data: {
    name: string;
    description?: string;
    organizationId?: string;
    permissions: string[];
    metadata?: Record<string, unknown>;
  }): Promise<unknown>;
  updateRole(
    id: string,
    data: {
      name?: string;
      description?: string;
      permissions?: string[];
      metadata?: Record<string, unknown>;
    }
  ): Promise<unknown | null>;
  deleteRole(id: string): Promise<boolean>;
  assignPermissions(id: string, permissions: string[]): Promise<unknown | null>;
  revokePermissions(id: string, permissions: string[]): Promise<unknown | null>;
}

export function makeRoleController(roleService: RoleService) {
  async function listRoles(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validated = req.validated as ListRolesInput | undefined;
      const { limit = 20, search, organizationId } =
        validated?.query ?? {};
      const result = await roleService.listRoles({
        page: 1,
        limit: Number(limit),
        search,
        organizationId,
      });
      sendPage(res, result.items, {
        total: result.total,
        nextCursor: null,
        hasMore: false,
      });
    } catch (e) {
      next(e);
    }
  }

  async function getRole(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validated = req.validated as GetRoleInput | undefined;
      const id = validated?.params.id ?? req.params["id"] ?? "";
      const role = await roleService.getRoleById(id);
      if (role === null) {
        return next(new HttpError(404, "NOT_FOUND", "Role not found"));
      }
      sendOk(res, role);
    } catch (e) {
      next(e);
    }
  }

  async function createRole(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validated = req.validated as CreateRoleInput | undefined;
      const body = validated?.body ?? req.body;
      const role = await roleService.createRole({
        name: body.name,
        description: body.description,
        organizationId: body.organizationId,
        permissions: body.permissions ?? [],
        metadata: body.metadata,
      });
      sendCreated(res, role);
    } catch (e) {
      if (e instanceof ConflictError) {
        return next(new HttpError(409, "CONFLICT", e.message));
      }
      next(e);
    }
  }

  async function updateRole(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validated = req.validated as UpdateRoleInput | undefined;
      const id = validated?.params.id ?? req.params["id"] ?? "";
      const body = validated?.body ?? req.body;
      const role = await roleService.updateRole(id, {
        name: body.name,
        description: body.description,
        permissions: body.permissions,
        metadata: body.metadata,
      });
      if (role === null) {
        return next(new HttpError(404, "NOT_FOUND", "Role not found"));
      }
      sendOk(res, role);
    } catch (e) {
      next(e);
    }
  }

  async function deleteRole(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validated = req.validated as DeleteRoleInput | undefined;
      const id = validated?.params.id ?? req.params["id"] ?? "";
      const deleted = await roleService.deleteRole(id);
      if (!deleted) {
        return next(new HttpError(404, "NOT_FOUND", "Role not found"));
      }
      sendNoContent(res);
    } catch (e) {
      next(e);
    }
  }

  async function assignPermissions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validated = req.validated as AssignPermissionsInput | undefined;
      const id = validated?.params.id ?? req.params["id"] ?? "";
      const { permissions } = validated?.body ?? req.body;
      const role = await roleService.assignPermissions(id, permissions);
      if (role === null) {
        return next(new HttpError(404, "NOT_FOUND", "Role not found"));
      }
      sendOk(res, role);
    } catch (e) {
      next(e);
    }
  }

  async function revokePermissions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validated = req.validated as RevokePermissionsInput | undefined;
      const id = validated?.params.id ?? req.params["id"] ?? "";
      const { permissions } = validated?.body ?? req.body;
      const role = await roleService.revokePermissions(id, permissions);
      if (role === null) {
        return next(new HttpError(404, "NOT_FOUND", "Role not found"));
      }
      sendOk(res, role);
    } catch (e) {
      next(e);
    }
  }

  return {
    listRoles,
    getRole,
    createRole,
    updateRole,
    deleteRole,
    assignPermissions,
    revokePermissions,
  };
}
