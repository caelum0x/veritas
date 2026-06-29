// Audit-logs routes: wires controllers and validation middleware, exports registerAuditLogsRoutes.
import type { Router } from "express";
import type { Deps } from "../../container.js";
import { asyncHandler } from "../../http/async-handler.js";
import { validateRequest } from "../../middleware/validate.js";
import { AuditLogsFeatureService } from "./audit-logs.service.js";
import { AuditLogsController } from "./audit-logs.controller.js";
import {
  AppendAuditLogBodySchema,
  AuditLogIdParamSchema,
  ListAuditLogsQuerySchema,
  SummarizeQuerySchema,
  ExportAuditLogsBodySchema,
} from "./audit-logs.schema.js";

export function registerAuditLogsRoutes(router: Router, deps: Deps): void {
  const svc = new AuditLogsFeatureService(deps);
  const ctrl = new AuditLogsController(svc);

  // POST /audit-logs — append a new immutable audit log entry
  router.post(
    "/audit-logs",
    validateRequest(AppendAuditLogBodySchema, "body"),
    asyncHandler(ctrl.append.bind(ctrl)),
  );

  // GET /audit-logs — list audit log entries with optional filters
  router.get(
    "/audit-logs",
    validateRequest(ListAuditLogsQuerySchema, "query"),
    asyncHandler(ctrl.list.bind(ctrl)),
  );

  // GET /audit-logs/summary — aggregate summary of audit activity
  router.get(
    "/audit-logs/summary",
    validateRequest(SummarizeQuerySchema, "query"),
    asyncHandler(ctrl.summarize.bind(ctrl)),
  );

  // POST /audit-logs/export — export audit logs in a specified format
  router.post(
    "/audit-logs/export",
    validateRequest(ExportAuditLogsBodySchema, "body"),
    asyncHandler(ctrl.exportLogs.bind(ctrl)),
  );

  // GET /audit-logs/:auditLogId — fetch single audit log entry
  router.get(
    "/audit-logs/:auditLogId",
    validateRequest(AuditLogIdParamSchema, "params"),
    asyncHandler(ctrl.getById.bind(ctrl)),
  );
}
