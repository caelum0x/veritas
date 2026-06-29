// In-memory implementation of AuditLogRepository for testing and local development.
import { ok, err, type Result, type Page, InternalError } from "@veritas/core";
import type { AuditLog, CreateAuditLog, AuditActorType } from "@veritas/contracts";
import type { AuditLogRepository, AuditLogUpdate } from "../repositories/auditLog.repository.js";
import type { QueryOptions } from "../query.js";
import { evalFilter, applySort } from "../query.js";
import { paginateArray } from "../pagination.js";
import { RepositoryNotFoundError } from "../errors.js";
import { rowToAuditLog, createDtoToRow, type AuditLogRow } from "../mappers/auditLog.mapper.js";

/** In-memory store for AuditLog rows, keyed by ID. */
export class AuditLogMemoryRepository implements AuditLogRepository {
  private readonly store = new Map<string, AuditLogRow>();

  private now(): string {
    return new Date().toISOString();
  }

  async findById(id: string): Promise<Result<AuditLog>> {
    const row = this.store.get(id);
    if (row === undefined) {
      return err(new RepositoryNotFoundError("AuditLog", id));
    }
    return ok(rowToAuditLog(row));
  }

  async list(options?: QueryOptions<AuditLog>): Promise<Result<Page<AuditLog>>> {
    let rows = Array.from(this.store.values()).map(rowToAuditLog);

    if (options?.filter !== undefined) {
      rows = rows.filter((r) => evalFilter(r, options.filter!));
    }

    if (options?.sort !== undefined && options.sort.length > 0) {
      rows = applySort(rows, options.sort);
    } else {
      rows = rows.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    }

    return ok(paginateArray(rows, options?.page));
  }

  async create(dto: CreateAuditLog): Promise<Result<AuditLog>> {
    const now = this.now();
    const row = createDtoToRow(dto, now);
    this.store.set(row.id, row);
    return ok(rowToAuditLog(row));
  }

  /** Audit logs are immutable; always returns an error. */
  async update(_id: string, _dto: AuditLogUpdate): Promise<Result<AuditLog>> {
    return err(new InternalError({ message: "AuditLog records are immutable and cannot be updated." }));
  }

  async delete(id: string): Promise<Result<AuditLog>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("AuditLog", id));
    }
    this.store.delete(id);
    return ok(rowToAuditLog(existing));
  }

  async findByOrganizationId(
    organizationId: string,
    options?: QueryOptions<AuditLog>
  ): Promise<Result<Page<AuditLog>>> {
    return this.list({
      ...options,
      filter: {
        and: [
          { field: "organizationId", operator: "eq", value: organizationId },
          ...(options?.filter?.and ?? []),
        ],
      },
    });
  }

  async findByActor(
    actorType: AuditActorType,
    actorId: string,
    options?: QueryOptions<AuditLog>
  ): Promise<Result<Page<AuditLog>>> {
    return this.list({
      ...options,
      filter: {
        and: [
          { field: "actorType", operator: "eq", value: actorType },
          { field: "actorId", operator: "eq", value: actorId },
          ...(options?.filter?.and ?? []),
        ],
      },
    });
  }

  async findByResource(
    resourceType: string,
    resourceId: string,
    options?: QueryOptions<AuditLog>
  ): Promise<Result<Page<AuditLog>>> {
    return this.list({
      ...options,
      filter: {
        and: [
          { field: "resourceType", operator: "eq", value: resourceType },
          { field: "resourceId", operator: "eq", value: resourceId },
          ...(options?.filter?.and ?? []),
        ],
      },
    });
  }

  async findByTimeRange(
    from: string,
    to: string,
    options?: QueryOptions<AuditLog>
  ): Promise<Result<Page<AuditLog>>> {
    return this.list({
      ...options,
      filter: {
        and: [
          { field: "occurredAt", operator: "gte", value: from },
          { field: "occurredAt", operator: "lte", value: to },
          ...(options?.filter?.and ?? []),
        ],
      },
    });
  }
}
