// User controller handlers — create, list, get, update, set status, and verify email.
import type { Request, Response, NextFunction } from "express";
import { epochToIso, type Id } from "@veritas/core";
import type { UserService, ServiceContext } from "@veritas/services";
import { asyncHandler } from "../http/async-handler.js";
import { respondOk, respondCreated, respondPage, respondError } from "../http/responder.js";
import { toHttpError } from "../http/api-error.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import {
  listUsersQuerySchema,
  userIdParamSchema,
  createUserBodySchema,
  updateUserBodySchema,
  setUserStatusBodySchema,
  verifyEmailBodySchema,
} from "../validators/user.validator.js";

function toId(value: string): Id<string> {
  return value as Id<string>;
}

function buildContext(req: Request): ServiceContext {
  const authed = req as AuthenticatedRequest;
  return {
    principal: {
      userId: toId(authed.userId ?? "system"),
      orgId: authed.orgId ? toId(authed.orgId) : undefined,
      roles: authed.scopes ?? [],
      apiKeyId: authed.apiKeyId ? toId(authed.apiKeyId) : undefined,
    },
    traceId: req.requestId,
    requestId: req.requestId,
    requestedAt: epochToIso(Date.now()),
  };
}

export function makeUserController(userService: UserService) {
  const listUsers = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const query = listUsersQuerySchema.parse(req.query);
      const ctx = buildContext(req);
      const result = await userService.listUsers(ctx, {
        email: query.email,
        status: query.status,
        limit: query.limit,
        cursor: query.cursor,
      });
      if (!result.ok) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      const { items, nextCursor } = result.value;
      respondPage(res, { items, nextCursor: nextCursor ?? null, hasMore: nextCursor !== null });
    },
  );

  const getUser = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const { id } = userIdParamSchema.parse(req.params);
      const ctx = buildContext(req);
      const result = await userService.getUser(ctx, id);
      if (!result.ok) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      respondOk(res, result.value);
    },
  );

  const createUser = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const body = createUserBodySchema.parse(req.body);
      const ctx = buildContext(req);
      const result = await userService.createUser(ctx, body);
      if (!result.ok) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      respondCreated(res, result.value);
    },
  );

  const updateUser = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const { id } = userIdParamSchema.parse(req.params);
      const body = updateUserBodySchema.parse(req.body);
      const ctx = buildContext(req);
      const result = await userService.updateUser(ctx, id, body);
      if (!result.ok) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      respondOk(res, result.value);
    },
  );

  const setUserStatus = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const { id } = userIdParamSchema.parse(req.params);
      const body = setUserStatusBodySchema.parse(req.body);
      const ctx = buildContext(req);
      const result = await userService.setUserStatus(ctx, { userId: id, status: body.status, reason: body.reason });
      if (!result.ok) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      respondOk(res, result.value);
    },
  );

  const verifyEmail = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const { id } = userIdParamSchema.parse(req.params);
      const body = verifyEmailBodySchema.parse(req.body);
      const ctx = buildContext(req);
      const result = await userService.verifyEmail(ctx, { userId: id, token: body.token });
      if (!result.ok) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      respondOk(res, result.value);
    },
  );

  return { listUsers, getUser, createUser, updateUser, setUserStatus, verifyEmail };
}
