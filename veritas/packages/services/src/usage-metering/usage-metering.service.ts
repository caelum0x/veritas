// Usage-metering application service: records and queries metered usage events.
import { Result, AppError, epochToIso, toPageRequest } from "@veritas/core";
import type { Page } from "@veritas/core";
import type { Usage } from "@veritas/contracts";
import type { UsageRepository, FilterCondition } from "@veritas/persistence";
import { BaseService, type BaseServiceDeps } from "../base-service.js";
import type { ServiceContext } from "../service-context.js";
import { serviceCall } from "../result.js";
import { ResourceNotFoundError, ServiceValidationError } from "../errors.js";
import type {
  RecordUsageInput,
  ListUsageInput,
  UsageSummaryInput,
  UsageSummaryOutput,
} from "./usage-metering.dto.js";

/** Dependencies injected into UsageMeteringService. */
export interface UsageMeteringServiceDeps extends BaseServiceDeps {
  readonly usageRepository: UsageRepository;
}

/** Application service for recording and querying metered usage. */
export class UsageMeteringService extends BaseService {
  private readonly usage: UsageRepository;

  constructor(deps: UsageMeteringServiceDeps) {
    super(deps);
    this.usage = deps.usageRepository;
  }

  /**
   * Record a single usage event, optionally deduplicated by idempotencyKey.
   * Returns the existing record if the key was already consumed.
   */
  async record(
    ctx: ServiceContext,
    input: RecordUsageInput,
  ): Promise<Result<Usage, AppError>> {
    return serviceCall(async () => {
      if (input.quantity < 0) {
        throw new ServiceValidationError("Usage quantity must be non-negative.");
      }

      if (input.idempotencyKey) {
        const existing = await this.usage.findByIdempotencyKey(input.idempotencyKey);
        if (existing.ok) {
          this.log(ctx, "debug", "usage.record.idempotent", {
            key: input.idempotencyKey,
            usageId: existing.value.id,
          });
          return existing.value;
        }
      }

      const now = epochToIso(Date.now());
      const result = await this.usage.create({ ...input, recordedAt: now } as unknown as RecordUsageInput);

      if (!result.ok) {
        throw result.error;
      }

      this.log(ctx, "info", "usage.recorded", {
        usageId: result.value.id,
        metric: result.value.metric,
        quantity: result.value.quantity,
        organizationId: result.value.organizationId,
      });
      return result.value;
    });
  }

  /** Retrieve a usage record by its id. */
  async getById(
    ctx: ServiceContext,
    id: string,
  ): Promise<Result<Usage, AppError>> {
    return serviceCall(async () => {
      const result = await this.usage.findById(id);
      if (!result.ok) {
        throw new ResourceNotFoundError("Usage", id);
      }
      this.log(ctx, "debug", "usage.getById", { usageId: id });
      return result.value;
    });
  }

  /** List usage records for an organization with optional filters and pagination. */
  async list(
    ctx: ServiceContext,
    input: ListUsageInput,
  ): Promise<Result<Page<Usage>, AppError>> {
    return serviceCall(async () => {
      const { organizationId, subscriptionId, metric, from, to, cursor, limit } = input;
      const page = toPageRequest({ cursor, limit });

      const andConditions: FilterCondition<Usage>[] = [
        { field: "organizationId", operator: "eq", value: organizationId },
      ];

      if (subscriptionId !== undefined) {
        andConditions.push({ field: "subscriptionId", operator: "eq", value: subscriptionId });
      }
      if (metric !== undefined) {
        andConditions.push({ field: "metric", operator: "eq", value: metric });
      }
      if (from !== undefined) {
        andConditions.push({ field: "recordedAt", operator: "gte", value: from });
      }
      if (to !== undefined) {
        andConditions.push({ field: "recordedAt", operator: "lte", value: to });
      }

      const result = await this.usage.list({ filter: { and: andConditions }, page });

      if (!result.ok) {
        throw result.error;
      }

      this.log(ctx, "debug", "usage.list", {
        organizationId,
        count: result.value.items.length,
      });
      return result.value;
    });
  }

  /**
   * Compute the total quantity for a metric in a time range for an organization.
   * Useful for quota enforcement and invoice line-item generation.
   */
  async summarize(
    ctx: ServiceContext,
    input: UsageSummaryInput,
  ): Promise<Result<UsageSummaryOutput, AppError>> {
    return serviceCall(async () => {
      const { organizationId, metric, from, to } = input;

      const result = await this.usage.sumQuantityByMetric(organizationId, metric, from, to);

      if (!result.ok) {
        throw result.error;
      }

      this.log(ctx, "debug", "usage.summarize", {
        organizationId,
        metric,
        from,
        to,
        totalQuantity: result.value,
      });

      return { organizationId, metric, from, to, totalQuantity: result.value };
    });
  }
}
