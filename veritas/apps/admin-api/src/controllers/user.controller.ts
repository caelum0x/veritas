// Admin controller for user CRUD and role-assignment operations
import type { Request, Response, NextFunction } from "express";
import { sendOk, sendCreated, sendNoContent, sendPage } from "../http/responder.js";
import { HttpError } from "../http/api-error.js";
import type { ListUsersQuery, UserIdParam, UpdateUserBody, AssignRoleInput, RevokeRoleInput } from "../validators/user.validator.js";
import { ListUsersQuerySchema, UserIdParamSchema, UpdateUserBodySchema, AssignRoleBodySchema, RevokeRoleBodySchema } from "../validators/user.validator.js";

export interface UserRecord {
  id: string;
  displayName: string;
  email: string;
  isActive: boolean;
  organizationId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface UserService {
  listUsers(params: {
    page: number;
    limit: number;
    search?: string;
    organizationId?: string;
    isActive?: boolean;
  }): Promise<{ items: UserRecord[]; total: number; page: number; limit: number }>;
  getUserById(id: string): Promise<UserRecord | null>;
  updateUser(id: string, data: Partial<Pick<UserRecord, "displayName" | "email" | "isActive" | "metadata">>): Promise<UserRecord | null>;
  deleteUser(id: string): Promise<boolean>;
  assignRole(userId: string, roleId: string, organizationId?: string): Promise<{ userId: string; roleId: string; organizationId?: string }>;
  revokeRole(userId: string, roleId: string, organizationId?: string): Promise<boolean>;
}

export function makeUserController(userService: UserService) {
  async function listUsers(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const parsed = ListUsersQuerySchema.safeParse({ query: req.query });
      if (!parsed.success) {
        return next(new HttpError(422, "VALIDATION", "Invalid query parameters"));
      }
      const { page = 1, limit = 20, search, organizationId, isActive } = parsed.data.query as {
        page?: number; limit?: number; search?: string; organizationId?: string; isActive?: boolean;
      };
      const result = await userService.listUsers({ page: Number(page), limit: Number(limit), search, organizationId, isActive });
      const meta = { total: result.total, nextCursor: null as string | null, hasMore: false };
      sendPage(res, result.items, meta);
    } catch (e) {
      next(e);
    }
  }

  async function getUser(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const params = UserIdParamSchema.safeParse(req.params);
      if (!params.success) {
        return next(new HttpError(422, "VALIDATION", "Invalid user id"));
      }
      const user = await userService.getUserById(params.data.id);
      if (user === null) {
        return next(new HttpError(404, "NOT_FOUND", `User '${params.data.id}' not found`));
      }
      sendOk(res, user);
    } catch (e) {
      next(e);
    }
  }

  async function updateUser(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const params = UserIdParamSchema.safeParse(req.params);
      if (!params.success) {
        return next(new HttpError(422, "VALIDATION", "Invalid user id"));
      }
      const body = UpdateUserBodySchema.safeParse({ body: req.body });
      if (!body.success) {
        return next(new HttpError(422, "VALIDATION", "Invalid request body"));
      }
      const user = await userService.updateUser(params.data.id, body.data.body);
      if (user === null) {
        return next(new HttpError(404, "NOT_FOUND", `User '${params.data.id}' not found`));
      }
      sendOk(res, user);
    } catch (e) {
      next(e);
    }
  }

  async function deleteUser(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const params = UserIdParamSchema.safeParse(req.params);
      if (!params.success) {
        return next(new HttpError(422, "VALIDATION", "Invalid user id"));
      }
      const deleted = await userService.deleteUser(params.data.id);
      if (!deleted) {
        return next(new HttpError(404, "NOT_FOUND", `User '${params.data.id}' not found`));
      }
      sendNoContent(res);
    } catch (e) {
      next(e);
    }
  }

  async function assignRole(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const input = AssignRoleBodySchema.safeParse({ params: req.params, body: req.body });
      if (!input.success) {
        return next(new HttpError(422, "VALIDATION", "Invalid role assignment input"));
      }
      const { id } = input.data.params;
      const { roleId, organizationId } = input.data.body;
      const assignment = await userService.assignRole(id, roleId, organizationId);
      sendCreated(res, assignment);
    } catch (e) {
      next(e);
    }
  }

  async function revokeRole(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const input = RevokeRoleBodySchema.safeParse({ params: req.params, body: req.body });
      if (!input.success) {
        return next(new HttpError(422, "VALIDATION", "Invalid role revocation input"));
      }
      const { id } = input.data.params;
      const { roleId, organizationId } = input.data.body;
      const revoked = await userService.revokeRole(id, roleId, organizationId);
      if (!revoked) {
        return next(new HttpError(404, "NOT_FOUND", `Role assignment not found for user '${id}'`));
      }
      sendNoContent(res);
    } catch (e) {
      next(e);
    }
  }

  return { listUsers, getUser, updateUser, deleteUser, assignRole, revokeRole };
}
