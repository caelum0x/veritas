// AuditLogRepository interface for persisting immutable audit log entries.
import type { Result, Page } from "@veritas/core";
import type { AuditLog, CreateAuditLog, AuditActorType } from "@veritas/contracts";
import type { BaseRepository } from "../base-repository.js";
import type { QueryOptions } from "../query.js";

/** AuditLog update is intentionally not supported — audit logs are immutable. */
export type AuditLogUpdate = never;

/** Extended repository interface for AuditLog entities. */
export interface AuditLogRepository
  extends BaseRepository<AuditLog, CreateAuditLog, AuditLogUpdate> {
  /** Find a single audit log entry by its opaque ID. */
  findById(id: string): Promise<Result<AuditLog>>;

  /** List audit log entries with optional filtering, sorting, and cursor pagination. */
  list(options?: QueryOptions<AuditLog>): Promise<Result<Page<AuditLog>>>;

  /** Persist a new audit log entry. */
  create(dto: CreateAuditLog): Promise<Result<AuditLog>>;

  /** Audit logs are immutable; this always rejects with an error. */
  update(id: string, dto: AuditLogUpdate): Promise<Result<AuditLog>>;

  /** Remove an audit log entry by ID (admin / retention-purge only). */
  delete(id: string): Promise<Result<AuditLog>>;

  /** Find all audit log entries for a specific organization. */
  findByOrganizationId(organizationId: string, options?: QueryOptions<AuditLog>): Promise<Result<Page<AuditLog>>>;

  /** Find all audit log entries recorded by a specific actor (user, agent, etc.). */
  findByActor(actorType: AuditActorType, actorId: string, options?: QueryOptions<AuditLog>): Promise<Result<Page<AuditLog>>>;

  /** Find audit log entries targeting a specific resource. */
  findByResource(resourceType: string, resourceId: string, options?: QueryOptions<AuditLog>): Promise<Result<Page<AuditLog>>>;

  /** Find audit log entries within an ISO timestamp range [from, to]. */
  findByTimeRange(from: string, to: string, options?: QueryOptions<AuditLog>): Promise<Result<Page<AuditLog>>>;
}
