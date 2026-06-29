// Maps AuditLogOutput domain objects and export results to HTTP response shapes.
import type { AuditLogOutput } from "@veritas/services";

export interface AuditLogResponse {
  readonly id: string;
  readonly organizationId: string | null;
  readonly actorType: string;
  readonly actorId: string | null;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string | null;
  readonly ip: string | null;
  readonly userAgent: string | null;
  readonly metadata: Record<string, unknown> | undefined;
  readonly occurredAt: string;
}

export interface AuditLogListResponse {
  readonly items: readonly AuditLogResponse[];
  readonly nextCursor: string | null;
  readonly total: number;
}

export interface AuditSummaryResponse {
  readonly totalEvents: number;
  readonly uniqueActors: number;
  readonly lastEventAt: string | null;
  readonly actionBreakdown: Record<string, number>;
}

export function toAuditLogResponse(output: AuditLogOutput): AuditLogResponse {
  return {
    id: output.id,
    organizationId: (output as unknown as Record<string, string | null>)["organizationId"] ?? null,
    actorType: String(output.actorType),
    actorId: (output as unknown as Record<string, string | null>)["actorId"] ?? null,
    action: output.action,
    resourceType: output.resourceType,
    resourceId: (output as unknown as Record<string, string | null>)["resourceId"] ?? null,
    ip: (output as unknown as Record<string, string | null>)["ip"] ?? null,
    userAgent: (output as unknown as Record<string, string | null>)["userAgent"] ?? null,
    metadata: output.metadata as Record<string, unknown> | undefined,
    occurredAt: String(output.occurredAt),
  };
}

export function toAuditLogListResponse(output: {
  items: AuditLogOutput[];
  nextCursor: string | null;
  total: number;
}): AuditLogListResponse {
  return {
    items: output.items.map(toAuditLogResponse),
    nextCursor: output.nextCursor,
    total: output.total,
  };
}
