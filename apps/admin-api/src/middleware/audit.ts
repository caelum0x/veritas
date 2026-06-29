// Middleware that records an audit log entry after every mutating (non-GET) request.
import type { Request, Response, NextFunction } from "express";
import type { Logger } from "@veritas/core";

export interface AuditLogger {
  log(entry: AuditEntry): Promise<void>;
}

export interface AuditEntry {
  readonly actorId: string | undefined;
  readonly actorType: "user" | "api_key" | "system";
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string | undefined;
  readonly tenantId: string | undefined;
  readonly method: string;
  readonly path: string;
  readonly statusCode: number;
  readonly durationMs: number;
  readonly timestamp: string;
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function auditMiddleware(auditLogger: AuditLogger, logger: Logger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!MUTATING_METHODS.has(req.method)) {
      next();
      return;
    }

    const startedAt = Date.now();

    res.on("finish", () => {
      const actor = (req as Request & { actor?: { id?: string; type?: string } }).actor;
      const tenantId = (req as Request & { tenantId?: string }).tenantId;

      const segments = req.path.split("/").filter(Boolean);
      const resourceType = segments[0] ?? "unknown";
      const resourceId =
        segments.length > 1 && /^[a-zA-Z0-9_-]+$/.test(segments[1] ?? "")
          ? segments[1]
          : undefined;

      const entry: AuditEntry = {
        actorId: actor?.id,
        actorType: (actor?.type as AuditEntry["actorType"]) ?? "system",
        action: `${req.method} ${req.path}`,
        resourceType,
        resourceId,
        tenantId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      };

      auditLogger.log(entry).catch((e: unknown) => {
        logger.warn("audit log failed", { error: e instanceof Error ? e.message : String(e) });
      });
    });

    next();
  };
}
