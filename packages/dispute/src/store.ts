// DisputeRepository interface + in-memory implementation backed by MemoryStore.

import { ok, err, epochToIso, systemClock, type Result, type Page, DEFAULT_PAGE_SIZE } from "@veritas/core";
import { MemoryStore, paginateArray, evalFilter, applySort, RepositoryNotFoundError } from "@veritas/persistence";
import type { QueryOptions } from "@veritas/persistence";
import type { BaseRepository } from "@veritas/persistence";
import { type Dispute, type CreateDisputeInput, createDispute } from "./dispute.js";
import type { DisputeListParams } from "./types.js";
import { DisputeNotFoundError } from "./errors.js";

/** Update payload accepted by DisputeRepository.update. */
export interface UpdateDisputeDto {
  readonly status?: string;
  readonly resolution?: string | null;
  readonly arbitratorId?: string | null;
  readonly resolvedAt?: string | null;
  readonly metadata?: Record<string, unknown>;
}

/** Port interface for dispute persistence. */
export interface DisputeRepository extends BaseRepository<Dispute, CreateDisputeInput, UpdateDisputeDto> {
  findByClaimId(claimId: string, options?: QueryOptions<Dispute>): Promise<Result<Page<Dispute>>>;
  findByVerificationId(verificationId: string, options?: QueryOptions<Dispute>): Promise<Result<Page<Dispute>>>;
  findByInitiatorId(initiatorId: string, options?: QueryOptions<Dispute>): Promise<Result<Page<Dispute>>>;
  findByStatus(status: string, options?: QueryOptions<Dispute>): Promise<Result<Page<Dispute>>>;
  listWithParams(params: DisputeListParams): Promise<Result<Page<Dispute>>>;
}

/** In-memory DisputeRepository for development and testing. */
export class DisputeMemoryRepository implements DisputeRepository {
  private readonly store = new MemoryStore<Dispute & { id: string }>();
  private readonly clock = systemClock;

  async findById(id: string): Promise<Result<Dispute>> {
    const item = this.store.get(id);
    if (item === undefined) return err(new DisputeNotFoundError(id));
    return ok(item);
  }

  async list(options?: QueryOptions<Dispute>): Promise<Result<Page<Dispute>>> {
    let rows = this.store.all();
    if (options?.filter !== undefined) {
      rows = rows.filter((r) => evalFilter(r, options.filter!));
    }
    if (options?.sort !== undefined && options.sort.length > 0) {
      rows = applySort(rows, options.sort);
    }
    return ok(paginateArray(rows, options?.page));
  }

  async create(dto: CreateDisputeInput): Promise<Result<Dispute>> {
    const dispute = createDispute(dto);
    const saved = this.store.set(dispute);
    return ok(saved);
  }

  async update(id: string, dto: UpdateDisputeDto): Promise<Result<Dispute>> {
    const existing = this.store.get(id);
    if (existing === undefined) return err(new DisputeNotFoundError(id));
    const updated: Dispute = {
      ...existing,
      ...(dto.status !== undefined ? { status: dto.status as Dispute["status"] } : {}),
      ...(dto.resolution !== undefined ? { resolution: dto.resolution } : {}),
      ...(dto.arbitratorId !== undefined ? { arbitratorId: dto.arbitratorId } : {}),
      ...(dto.resolvedAt !== undefined ? { resolvedAt: dto.resolvedAt } : {}),
      ...(dto.metadata !== undefined ? { metadata: dto.metadata } : {}),
      updatedAt: epochToIso(this.clock.now()),
    };
    return ok(this.store.set(updated));
  }

  async delete(id: string): Promise<Result<Dispute>> {
    const existing = this.store.get(id);
    if (existing === undefined) return err(new DisputeNotFoundError(id));
    this.store.delete(id);
    return ok(existing);
  }

  async findByClaimId(claimId: string, options?: QueryOptions<Dispute>): Promise<Result<Page<Dispute>>> {
    return this.list({
      ...options,
      filter: { and: [{ field: "claimId", operator: "eq", value: claimId }, ...(options?.filter?.and ?? [])] },
    });
  }

  async findByVerificationId(verificationId: string, options?: QueryOptions<Dispute>): Promise<Result<Page<Dispute>>> {
    return this.list({
      ...options,
      filter: { and: [{ field: "verificationId", operator: "eq", value: verificationId }, ...(options?.filter?.and ?? [])] },
    });
  }

  async findByInitiatorId(initiatorId: string, options?: QueryOptions<Dispute>): Promise<Result<Page<Dispute>>> {
    return this.list({
      ...options,
      filter: { and: [{ field: "initiatorId", operator: "eq", value: initiatorId }, ...(options?.filter?.and ?? [])] },
    });
  }

  async findByStatus(status: string, options?: QueryOptions<Dispute>): Promise<Result<Page<Dispute>>> {
    return this.list({
      ...options,
      filter: { and: [{ field: "status", operator: "eq", value: status }, ...(options?.filter?.and ?? [])] },
    });
  }

  async listWithParams(params: DisputeListParams): Promise<Result<Page<Dispute>>> {
    const conditions: Array<{ field: keyof Dispute; operator: "eq"; value: string }> = [];
    if (params.claimId) conditions.push({ field: "claimId", operator: "eq", value: params.claimId });
    if (params.verificationId) conditions.push({ field: "verificationId", operator: "eq", value: params.verificationId });
    if (params.initiatorId) conditions.push({ field: "initiatorId", operator: "eq", value: params.initiatorId });
    if (params.arbitratorId) conditions.push({ field: "arbitratorId", operator: "eq", value: params.arbitratorId });
    if (params.status) conditions.push({ field: "status", operator: "eq", value: params.status });

    return this.list({
      filter: conditions.length > 0 ? { and: conditions } : undefined,
      page: { cursor: params.cursor, limit: params.limit ?? DEFAULT_PAGE_SIZE },
    });
  }
}
