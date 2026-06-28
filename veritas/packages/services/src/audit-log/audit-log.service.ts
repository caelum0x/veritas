// Audit-log application service: append-only event recording and querying.
import { Result, AppError, newId, encodeCursor, decodeCursor, toPageRequest } from "@veritas/core";
import { AuditLogSchema } from "@veritas/contracts";
import { z } from "zod";
import { BaseService, BaseServiceDeps } from "../base-service.js";
import type { ServiceContext } from "../service-context.js";
import { serviceCall } from "../result.js";
import { ResourceNotFoundError, InsufficientPermissionsError } from "../errors.js";
import type {
  CreateAuditLogInput,
  ListAuditLogsInput,
  AuditLogOutput,
  AuditLogListOutput,
  AuditSummaryOutput,
} from "./audit-log.dto.js";

type AuditLogRecord = z.infer<typeof AuditLogSchema>;

/** Append-only in-memory store (replaced by persistence layer in production). */
const auditLogStore = new Map<string, AuditLogRecord>();

export interface AuditLogServiceDeps extends BaseServiceDeps {}

/** Application service for recording and retrieving immutable audit log entries. */
export class AuditLogService extends BaseService {
  constructor(deps: Partial<AuditLogServiceDeps> = {}) {
    super(deps);
  }

  /**
   * Append a new audit log entry.
   * Entries are immutable once written; this method always creates, never updates.
   */
  async append(
    ctx: ServiceContext,
    input: CreateAuditLogInput,
  ): Promise<Result<AuditLogOutput, AppError>> {
    return serviceCall(async () => {
      const now = this.now();
      const id = newId("aud");
      const record: AuditLogRecord = {
        id,
        ...input,
        occurredAt: now,
      } as unknown as AuditLogRecord;
      auditLogStore.set(id, record);
      this.log(ctx, "debug", "Audit log entry appended", {
        auditLogId: id,
        action: input.action,
      });
      return { ...record };
    });
  }

  /** Retrieve a single audit log entry by ID. */
  async getById(
    ctx: ServiceContext,
    auditLogId: string,
  ): Promise<Result<AuditLogOutput, AppError>> {
    return serviceCall(async () => {
      const record = auditLogStore.get(auditLogId);
      if (!record) throw new ResourceNotFoundError("AuditLog", auditLogId);
      this.assertReadAccess(ctx, record);
      return { ...record };
    });
  }

  /** List audit log entries with optional filtering and cursor-based pagination. */
  async list(
    ctx: ServiceContext,
    input: ListAuditLogsInput,
  ): Promise<Result<AuditLogListOutput, AppError>> {
    return serviceCall(async () => {
      const callerOrgId = ctx.principal.orgId ?? ctx.principal.userId;
      const isAdmin = ctx.principal.roles.includes("admin");

      let items = Array.from(auditLogStore.values());

      // Non-admins may only view their own organisation's logs.
      if (!isAdmin) {
        const filterOrgId = input.orgId ?? callerOrgId;
        if (filterOrgId !== callerOrgId) {
          throw new InsufficientPermissionsError("view audit logs for another org");
        }
        items = items.filter(
          (e) => (e as unknown as Record<string, unknown>)["orgId"] === callerOrgId,
        );
      } else if (input.orgId) {
        items = items.filter(
          (e) => (e as unknown as Record<string, unknown>)["orgId"] === input.orgId,
        );
      }

      if (input.actorId) {
        items = items.filter(
          (e) => (e as unknown as Record<string, unknown>)["actorId"] === input.actorId,
        );
      }
      if (input.actorType) {
        items = items.filter(
          (e) =>
            (e as unknown as Record<string, unknown>)["actorType"] === input.actorType,
        );
      }
      if (input.resourceType) {
        items = items.filter(
          (e) =>
            (e as unknown as Record<string, unknown>)["resourceType"] ===
            input.resourceType,
        );
      }
      if (input.resourceId) {
        items = items.filter(
          (e) =>
            (e as unknown as Record<string, unknown>)["resourceId"] === input.resourceId,
        );
      }
      if (input.action) {
        items = items.filter(
          (e) => (e as unknown as Record<string, unknown>)["action"] === input.action,
        );
      }
      if (input.fromTimestamp) {
        const from = new Date(input.fromTimestamp).getTime();
        items = items.filter(
          (e) => new Date(String(e.occurredAt)).getTime() >= from,
        );
      }
      if (input.toTimestamp) {
        const to = new Date(input.toTimestamp).getTime();
        items = items.filter(
          (e) => new Date(String(e.occurredAt)).getTime() <= to,
        );
      }

      // Sort descending by creation time.
      items.sort(
        (a, b) =>
          new Date(String(b.occurredAt)).getTime() -
          new Date(String(a.occurredAt)).getTime(),
      );

      const { limit } = toPageRequest({ limit: input.limit, cursor: input.cursor });
      const offset = input.cursor ? Number(decodeCursor(input.cursor) ?? 0) : 0;
      const page = items.slice(offset, offset + limit);
      const nextCursor =
        offset + limit < items.length ? encodeCursor({ offset: offset + limit }) : null;

      return { items: page.map((e) => ({ ...e })), nextCursor, total: items.length };
    });
  }

  /**
   * Compute a summary of audit activity for a resource or actor.
   * Useful for dashboards and compliance reports.
   */
  async summarize(
    ctx: ServiceContext,
    input: Pick<ListAuditLogsInput, "orgId" | "resourceType" | "resourceId" | "actorId">,
  ): Promise<Result<AuditSummaryOutput, AppError>> {
    return serviceCall(async () => {
      const callerOrgId = ctx.principal.orgId ?? ctx.principal.userId;
      const isAdmin = ctx.principal.roles.includes("admin");
      const targetOrgId = input.orgId ?? callerOrgId;

      if (!isAdmin && targetOrgId !== callerOrgId) {
        throw new InsufficientPermissionsError("summarize audit logs for another org");
      }

      let items = Array.from(auditLogStore.values()).filter(
        (e) => (e as unknown as Record<string, unknown>)["orgId"] === targetOrgId,
      );

      if (input.resourceType) {
        items = items.filter(
          (e) =>
            (e as unknown as Record<string, unknown>)["resourceType"] ===
            input.resourceType,
        );
      }
      if (input.resourceId) {
        items = items.filter(
          (e) =>
            (e as unknown as Record<string, unknown>)["resourceId"] === input.resourceId,
        );
      }
      if (input.actorId) {
        items = items.filter(
          (e) =>
            (e as unknown as Record<string, unknown>)["actorId"] === input.actorId,
        );
      }

      const actorIds = new Set(
        items.map((e) => String((e as unknown as Record<string, unknown>)["actorId"])),
      );

      const actionBreakdown: Record<string, number> = {};
      for (const e of items) {
        const action = String((e as unknown as Record<string, unknown>)["action"] ?? "unknown");
        actionBreakdown[action] = (actionBreakdown[action] ?? 0) + 1;
      }

      const timestamps = items.map((e) =>
        new Date(String(e.occurredAt)).getTime(),
      );
      const lastEventAt =
        timestamps.length > 0
          ? new Date(Math.max(...timestamps)).toISOString()
          : null;

      return {
        totalEvents: items.length,
        uniqueActors: actorIds.size,
        lastEventAt,
        actionBreakdown,
      };
    });
  }

  /** Assert the caller has read access to the given log entry. */
  private assertReadAccess(ctx: ServiceContext, entry: AuditLogRecord): void {
    const callerOrgId = ctx.principal.orgId ?? ctx.principal.userId;
    const entryOrgId = (entry as unknown as Record<string, unknown>)["orgId"];
    const isAdmin = ctx.principal.roles.includes("admin");
    if (!isAdmin && entryOrgId !== callerOrgId) {
      throw new InsufficientPermissionsError("read audit log entry");
    }
  }
}
