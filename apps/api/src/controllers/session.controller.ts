// Session controller: handles login, token refresh, and session revocation.
import type { Request, Response, NextFunction } from "express";
import { isErr, isOk } from "@veritas/core";
import { asyncHandler } from "../http/async-handler.js";
import { respondOk, respondCreated, respondError } from "../http/responder.js";
import { toHttpError } from "../http/api-error.js";
import type { AppError, Result } from "@veritas/core";
import {
  CreateSessionBodySchema,
  RefreshSessionBodySchema,
  RevokeSessionBodySchema,
} from "../validators/session.validator.js";

type ServiceResult = Result<unknown, AppError>;

function getSessionService(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (req as any).container?.sessionService as {
    createSession: (email: string, password: string, redirectUrl?: string) => Promise<ServiceResult>;
    refreshSession: (refreshToken: string) => Promise<ServiceResult>;
    revokeSession: (actorId: string, sessionId?: string, all?: boolean) => Promise<ServiceResult>;
    getSession: (sessionId: string) => Promise<ServiceResult>;
    listSessions: (actorId: string) => Promise<ServiceResult>;
  };
}

function replyError(res: Response, result: ServiceResult): void {
  if (isErr(result)) {
    const httpErr = toHttpError(result.error);
    respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
  }
}

export const createSession = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const parsed = CreateSessionBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return respondError(res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten().fieldErrors);
  }
  const { email, password, redirectUrl } = parsed.data;
  const service = getSessionService(req);
  const result = await service.createSession(email, password, redirectUrl);
  if (isErr(result)) { replyError(res, result); return; }
  return respondCreated(res, result.value);
});

export const refreshSession = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const parsed = RefreshSessionBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return respondError(res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten().fieldErrors);
  }
  const { refreshToken } = parsed.data;
  const service = getSessionService(req);
  const result = await service.refreshSession(refreshToken);
  if (isErr(result)) { replyError(res, result); return; }
  return respondOk(res, result.value);
});

export const revokeSession = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const parsed = RevokeSessionBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return respondError(res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten().fieldErrors);
  }
  const { sessionId, all } = parsed.data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actorId: string = (req as any).auth?.userId ?? "";
  const service = getSessionService(req);
  const result = await service.revokeSession(actorId, sessionId, all);
  if (isErr(result)) { replyError(res, result); return; }
  return respondOk(res, { revoked: true });
});

export const getSession = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const id = req.params["id"] ?? "";
  const service = getSessionService(req);
  const result = await service.getSession(id);
  if (isErr(result)) { replyError(res, result); return; }
  return respondOk(res, result.value);
});

export const deleteSession = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const id = req.params["id"] ?? "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actorId: string = (req as any).auth?.userId ?? "";
  const service = getSessionService(req);
  const result = await service.revokeSession(actorId, id, false);
  if (isErr(result)) { replyError(res, result); return; }
  return respondOk(res, { revoked: true });
});

export const listSessions = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actorId: string = (req as any).auth?.userId ?? "";
  const service = getSessionService(req);
  const result = await service.listSessions(actorId);
  if (isErr(result)) { replyError(res, result); return; }
  return respondOk(res, result.value);
});
