// Maps AuditLog domain objects to/from persistence rows with clone-on-write semantics.
import type { AuditLog, CreateAuditLog } from "@veritas/contracts";
import { newId, epochToIso } from "@veritas/core";

/** Persistence row shape for an AuditLog. */
export interface AuditLogRow {
  readonly id: string;
  readonly organizationId: string | null;
  readonly actorType: string;
  readonly actorId: string | null;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string | null;
  readonly ip: string | null;
  readonly userAgent: string | null;
  readonly metadata?: Record<string, unknown>;
  readonly occurredAt: string;
}

/** Convert a persistence row to an AuditLog domain object. */
export function rowToAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id as AuditLog["id"],
    organizationId: row.organizationId as AuditLog["organizationId"],
    actorType: row.actorType as AuditLog["actorType"],
    actorId: row.actorId,
    action: row.action,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    ip: row.ip,
    userAgent: row.userAgent,
    ...(row.metadata !== undefined ? { metadata: { ...row.metadata } } : {}),
    occurredAt: row.occurredAt as AuditLog["occurredAt"],
  };
}

/** Convert a CreateAuditLog DTO into a persistence row, generating id and occurredAt. */
export function createDtoToRow(dto: CreateAuditLog, now: string): AuditLogRow {
  return {
    id: newId("aud"),
    organizationId: dto.organizationId ?? null,
    actorType: dto.actorType,
    actorId: dto.actorId,
    action: dto.action,
    resourceType: dto.resourceType,
    resourceId: dto.resourceId,
    ip: dto.ip,
    userAgent: dto.userAgent,
    ...(dto.metadata !== undefined ? { metadata: { ...dto.metadata } } : {}),
    occurredAt: now,
  };
}
