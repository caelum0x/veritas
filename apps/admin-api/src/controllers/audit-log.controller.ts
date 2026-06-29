// Admin controller for audit log read-only access
import type { Request, Response, NextFunction } from "express";
import { sendPage, sendOk } from "../http/responder.js";
import { HttpError } from "../http/api-error.js";
import {
  listAuditLogsQuerySchema,
  getAuditLogParamsSchema,
} from "../validators/audit-log.validator.js";

function getAuditLogService(req: Request) {
  const svc = (req as unknown as Record<string, unknown>)["auditLogService"];
  if (!svc) throw new HttpError(503, "UNAVAILABLE", "Audit log service not available");
  return svc as {
    listAuditLogs(opts: unknown): Promise<{ items: unknown[]; total: number; page: number; limit: number }>;
    getAuditLogById(id: string): Promise<unknown | null>;
  };
}

export async function listAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = listAuditLogsQuerySchema.safeParse(req.query);
    if (!query.success) throw new HttpError(422, "VALIDATION", "Invalid query parameters");
    const svc = getAuditLogService(req);
    const result = await svc.listAuditLogs(query.data);
    sendPage(res, result.items as readonly unknown[], {
      total: result.total,
      nextCursor: null,
      hasMore: false,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAuditLog(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = getAuditLogParamsSchema.safeParse(req.params);
    if (!params.success) throw new HttpError(422, "VALIDATION", "Invalid parameters");
    const svc = getAuditLogService(req);
    const record = await svc.getAuditLogById(params.data.auditLogId);
    if (record === null || record === undefined) {
      throw new HttpError(404, "NOT_FOUND", `Audit log ${params.data.auditLogId} not found`);
    }
    sendOk(res, record);
  } catch (err) {
    next(err);
  }
}
