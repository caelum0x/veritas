// Audit-logs feature service: delegates to AuditLogService and BufferExporter for export.
import type { Deps } from "../../container.js";
import type { ServiceContext } from "@veritas/services";
import type { Result } from "@veritas/services";
import type { AppError } from "@veritas/services";
import type { AuditLogOutput } from "@veritas/services";
import { err } from "@veritas/services";
import type { AuditEvent } from "@veritas/audit-export";
import type {
  AppendAuditLogBody,
  ListAuditLogsQuery,
  SummarizeQuery,
  ExportAuditLogsBody,
} from "./audit-logs.schema.js";

interface ExportRunResult {
  readonly eventsExported: number;
  readonly bytesWritten: number;
  readonly format: string;
  readonly exportedAt: string;
}

export class AuditLogsFeatureService {
  private readonly auditLogService: Deps["auditLogService"];
  private readonly auditExporter: Deps["auditExporter"];
  private readonly logger: Deps["logger"];

  constructor(deps: Pick<Deps, "auditLogService" | "auditExporter" | "logger">) {
    this.auditLogService = deps.auditLogService;
    this.auditExporter = deps.auditExporter;
    this.logger = deps.logger;
  }

  async append(
    ctx: ServiceContext,
    body: AppendAuditLogBody,
  ): Promise<Result<AuditLogOutput, AppError>> {
    this.logger.info("audit-logs.feature: append", { action: body.action });
    return this.auditLogService.append(ctx, body);
  }

  async getById(
    ctx: ServiceContext,
    auditLogId: string,
  ): Promise<Result<AuditLogOutput, AppError>> {
    return this.auditLogService.getById(ctx, auditLogId);
  }

  async list(
    ctx: ServiceContext,
    query: ListAuditLogsQuery,
  ): Promise<Result<{ items: AuditLogOutput[]; nextCursor: string | null; total: number }, AppError>> {
    return this.auditLogService.list(ctx, {
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
  }

  async summarize(
    ctx: ServiceContext,
    query: SummarizeQuery,
  ): Promise<Result<{
    totalEvents: number;
    uniqueActors: number;
    lastEventAt: string | null;
    actionBreakdown: Record<string, number>;
  }, AppError>> {
    return this.auditLogService.summarize(ctx, {
      orgId: query.orgId,
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      actorId: query.actorId,
    });
  }

  async exportLogs(
    ctx: ServiceContext,
    body: ExportAuditLogsBody,
  ): Promise<Result<ExportRunResult, AppError>> {
    this.logger.info("audit-logs.feature: export", { format: body.format, orgId: body.orgId });

    // Fetch the entries to export via the service list call
    const listResult = await this.auditLogService.list(ctx, {
      orgId: body.orgId,
      fromTimestamp: body.fromTimestamp,
      toTimestamp: body.toTimestamp,
      limit: body.limit ?? 1000,
    });

    if (!listResult.ok) {
      return err(listResult.error);
    }

    // Convert AuditLogOutput entries to AuditEvent format for the exporter
    const events: AuditEvent[] = listResult.value.items.map((entry) => {
      const raw = entry as unknown as Record<string, unknown>;
      return {
        id: entry.id,
        timestamp: String(entry.occurredAt),
        action: entry.action,
        category: "DATA_ACCESS" as const,
        severity: "LOW" as const,
        actor: {
          id: String(raw["actorId"] ?? "unknown"),
          type: (String(raw["actorType"] ?? "system").toLowerCase() === "user"
            ? "user"
            : "service") as "user" | "service" | "system",
        },
        resource: {
          type: entry.resourceType,
          id: String(raw["resourceId"] ?? "unknown"),
          orgId: String(raw["organizationId"] ?? body.orgId ?? ""),
        },
        outcome: "SUCCESS" as const,
      };
    });

    const exportResult = await this.auditExporter.export(events, {
      format: body.format,
      filter: {
        orgId: body.orgId,
        fromTimestamp: body.fromTimestamp,
        toTimestamp: body.toTimestamp,
        actorIds: body.actorIds,
        resourceTypes: body.resourceTypes,
      },
    });

    if (!exportResult.ok) {
      return err(exportResult.error as AppError);
    }
    return { ok: true, value: exportResult.value };
  }
}
