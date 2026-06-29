// Audit-logs controller: validates requests, calls the feature service, sends HTTP responses.
import type { Request, Response } from "express";
import { sendOk, sendCreated } from "../../http/responder.js";
import { unwrapResult } from "../../errors.js";
import { buildContext } from "../../context.js";
import { getValidated } from "../../middleware/validate.js";
import {
  toAuditLogResponse,
  toAuditLogListResponse,
} from "./audit-logs.mapper.js";
import type { AuditLogsFeatureService } from "./audit-logs.service.js";
import type {
  AppendAuditLogBody,
  AuditLogIdParam,
  ListAuditLogsQuery,
  SummarizeQuery,
  ExportAuditLogsBody,
} from "./audit-logs.schema.js";

export class AuditLogsController {
  constructor(private readonly svc: AuditLogsFeatureService) {}

  async append(req: Request, res: Response): Promise<void> {
    const ctx = buildContext(req);
    const body = getValidated<AppendAuditLogBody>(req);
    const result = await this.svc.append(ctx, body);
    sendCreated(res, toAuditLogResponse(unwrapResult(result)));
  }

  async getById(req: Request, res: Response): Promise<void> {
    const ctx = buildContext(req);
    const { auditLogId } = getValidated<AuditLogIdParam>(req);
    const result = await this.svc.getById(ctx, auditLogId);
    sendOk(res, toAuditLogResponse(unwrapResult(result)));
  }

  async list(req: Request, res: Response): Promise<void> {
    const ctx = buildContext(req);
    const query = getValidated<ListAuditLogsQuery>(req);
    const result = await this.svc.list(ctx, query);
    sendOk(res, toAuditLogListResponse(unwrapResult(result)));
  }

  async summarize(req: Request, res: Response): Promise<void> {
    const ctx = buildContext(req);
    const query = getValidated<SummarizeQuery>(req);
    const result = await this.svc.summarize(ctx, query);
    sendOk(res, unwrapResult(result));
  }

  async exportLogs(req: Request, res: Response): Promise<void> {
    const ctx = buildContext(req);
    const body = getValidated<ExportAuditLogsBody>(req);
    const result = await this.svc.exportLogs(ctx, body);
    sendOk(res, unwrapResult(result));
  }
}
