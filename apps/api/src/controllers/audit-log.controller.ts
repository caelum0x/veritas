// Audit-log controller handlers — list, get, append, and summarize audit entries.
import type { Request, Response, NextFunction } from "express";
import type { Id } from "@veritas/core";
import { epochToIso } from "@veritas/core";
import type { AuditLogService, ServiceContext } from "@veritas/services";
import { asyncHandler } from "../http/async-handler.js";
import { respondOk, respondCreated, respondPage, respondError } from "../http/responder.js";
import { toHttpError } from "../http/api-error.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import {
  listAuditLogsQuerySchema,
  auditLogIdParamSchema,
  createAuditLogBodySchema,
  summarizeQuerySchema,
} from "../validators/audit-log.validator.js";

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

export function makeAuditLogController(auditLogService: AuditLogService) {
  const listAuditLogs = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const query = listAuditLogsQuerySchema.parse(req.query);
      const ctx = buildContext(req);
      const result = await auditLogService.list(ctx, {
        orgId: query.orgId,
        actorId: query.actorId,
        actorType: query.actorType,
        resourceType: query.resourceType,
        resourceId: query.resourceId,
        action: query.action,
        fromTimestamp: query.fromTimestamp,
        toTimestamp: query.toTimestamp,
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

  const getAuditLog = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const { id } = auditLogIdParamSchema.parse(req.params);
      const ctx = buildContext(req);
      const result = await auditLogService.getById(ctx, id);
      if (!result.ok) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      respondOk(res, result.value);
    },
  );

  const appendAuditLog = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const body = createAuditLogBodySchema.parse(req.body);
      const ctx = buildContext(req);
      const result = await auditLogService.append(ctx, body);
      if (!result.ok) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      respondCreated(res, result.value);
    },
  );

  const summarizeAuditLogs = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const query = summarizeQuerySchema.parse(req.query);
      const ctx = buildContext(req);
      const result = await auditLogService.summarize(ctx, {
        orgId: query.orgId,
        resourceType: query.resourceType,
        resourceId: query.resourceId,
        actorId: query.actorId,
      });
      if (!result.ok) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      respondOk(res, result.value);
    },
  );

  return { listAuditLogs, getAuditLog, appendAuditLog, summarizeAuditLogs };
}
