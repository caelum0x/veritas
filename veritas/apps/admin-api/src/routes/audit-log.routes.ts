// Audit-log admin routes: read-only list and get endpoints.
import { Router } from "express";
import {
  listAuditLogs,
  getAuditLog,
} from "../controllers/audit-log.controller.js";

export function auditLogRouter(): Router {
  const router = Router();

  // List audit logs with filtering and pagination
  router.get("/", listAuditLogs);

  // Get a single audit log entry by ID
  router.get("/:id", getAuditLog);

  return router;
}
