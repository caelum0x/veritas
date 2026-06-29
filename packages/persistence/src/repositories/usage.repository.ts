// UsageRepository interface defining persistence operations for metered usage records.
import type { Result, Page } from "@veritas/core";
import type { Usage, CreateUsage, UsageMetric } from "@veritas/contracts";
import type { BaseRepository } from "../base-repository.js";
import type { QueryOptions } from "../query.js";

/** Extended repository interface for Usage entities. */
export interface UsageRepository extends BaseRepository<Usage, CreateUsage, Partial<CreateUsage>> {
  /** Find a single usage record by its opaque ID. */
  findById(id: string): Promise<Result<Usage>>;

  /** List usage records with optional filtering, sorting, and cursor pagination. */
  list(options?: QueryOptions<Usage>): Promise<Result<Page<Usage>>>;

  /** Create a new usage record from a CreateUsage DTO. */
  create(dto: CreateUsage): Promise<Result<Usage>>;

  /** Apply a partial update to an existing usage record. */
  update(id: string, dto: Partial<CreateUsage>): Promise<Result<Usage>>;

  /** Delete a usage record by ID, returning the deleted entity. */
  delete(id: string): Promise<Result<Usage>>;

  /** Find all usage records for a given organization. */
  findByOrganizationId(organizationId: string, options?: QueryOptions<Usage>): Promise<Result<Page<Usage>>>;

  /** Find all usage records for a given subscription. */
  findBySubscriptionId(subscriptionId: string, options?: QueryOptions<Usage>): Promise<Result<Page<Usage>>>;

  /** Sum the total quantity for a metric within a time range for an organization. */
  sumQuantityByMetric(
    organizationId: string,
    metric: UsageMetric,
    from: string,
    to: string,
  ): Promise<Result<number>>;

  /** Find a usage record by its idempotency key for deduplication. */
  findByIdempotencyKey(key: string): Promise<Result<Usage>>;
}
