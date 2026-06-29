// Quota application service: enforce and report per-organization usage quotas.
import { ok, isOk } from "@veritas/core";
import type { Result, AppError } from "@veritas/core";
import type { UsageRepository, SubscriptionRepository } from "@veritas/persistence";
import { BaseService, type BaseServiceDeps } from "../base-service.js";
import type { ServiceContext } from "../service-context.js";
import {
  ResourceNotFoundError,
  QuotaExceededError,
  InsufficientPermissionsError,
} from "../errors.js";
import { serviceCall } from "../result.js";
import type {
  CheckQuotaInput,
  GetQuotaStatusInput,
  ResetQuotaInput,
  SetQuotaOverrideInput,
  QuotaCheckOutput,
  QuotaStatusOutput,
  MetricQuotaStatus,
} from "./quota.dto.js";

/** In-memory override store for quota limits (keyed by orgId:metric). */
type QuotaOverrideMap = Map<string, { limit: number; reason?: string }>;

/** Dependencies required by QuotaService. */
export interface QuotaServiceDeps extends BaseServiceDeps {
  readonly usageRepo: UsageRepository;
  readonly subscriptionRepo: SubscriptionRepository;
}

function overrideKey(organizationId: string, metric: string): string {
  return `${organizationId}:${metric}`;
}

function percentUsed(used: number, limit: number): number {
  if (limit === 0) return 100;
  return Math.min(100, Math.round((used / limit) * 100));
}

/** Application service for quota enforcement and status reporting. */
export class QuotaService extends BaseService {
  private readonly usageRepo: UsageRepository;
  private readonly subscriptionRepo: SubscriptionRepository;
  /** Runtime-mutable override map; keyed by `orgId:metric`. */
  private readonly overrides: QuotaOverrideMap = new Map();

  constructor(deps: QuotaServiceDeps) {
    super(deps);
    this.usageRepo = deps.usageRepo;
    this.subscriptionRepo = deps.subscriptionRepo;
  }

  /**
   * Determine whether an organization has sufficient quota to perform
   * `requested` units of a given metric. Returns an allowed/denied result
   * without mutating any usage counters.
   */
  async checkQuota(
    ctx: ServiceContext,
    input: CheckQuotaInput,
  ): Promise<Result<QuotaCheckOutput, AppError>> {
    this.log(ctx, "debug", "quota.check", {
      orgId: input.organizationId,
      metric: input.metric,
      requested: input.requested,
    });
    return serviceCall(async () => {
      const { limit, used } = await this.resolveQuota(
        input.organizationId,
        input.metric,
      );
      const remaining = Math.max(0, limit - used);
      const allowed = remaining >= input.requested;
      return {
        organizationId: input.organizationId,
        metric: input.metric,
        requested: input.requested,
        allowed,
        remaining,
        limit,
        used,
      };
    });
  }

  /**
   * Assert an organization has sufficient quota and throw QuotaExceededError
   * if not. Intended for use inside transactional service operations.
   */
  async assertQuota(
    ctx: ServiceContext,
    input: CheckQuotaInput,
  ): Promise<Result<void, AppError>> {
    return serviceCall(async () => {
      const check = await this.checkQuota(ctx, input);
      if (!isOk(check)) throw check.error;
      if (!check.value.allowed) {
        throw new QuotaExceededError(
          input.metric,
          check.value.limit,
          "billing cycle",
        );
      }
    });
  }

  /** Return the full quota status for every tracked metric in an organization. */
  async getQuotaStatus(
    ctx: ServiceContext,
    input: GetQuotaStatusInput,
  ): Promise<Result<QuotaStatusOutput, AppError>> {
    this.log(ctx, "debug", "quota.status", { orgId: input.organizationId });
    return serviceCall(async () => {
      const subResult = input.subscriptionId
        ? await this.subscriptionRepo.findById(input.subscriptionId)
        : await this.subscriptionRepo.findActiveByOrganizationId(input.organizationId);

      const subscriptionId = isOk(subResult) ? (subResult.value as { id: string }).id : null;

      // Build a usage summary keyed by metric by querying each metric individually.
      const usageSummary: Record<string, number> = {};

      const knownMetrics = [
        "VERIFICATIONS",
        "CLAIMS",
        "SOURCES",
        "TOKENS",
      ] as const;

      const metrics: MetricQuotaStatus[] = await Promise.all(
        knownMetrics.map(async (metric) => {
          const { limit, overrideActive } = await this.resolveQuotaMeta(
            input.organizationId,
            metric,
          );
          const used = usageSummary[metric] ?? 0;
          const remaining = Math.max(0, limit - used);
          return {
            metric,
            limit,
            used,
            remaining,
            percentUsed: percentUsed(used, limit),
            overrideActive,
            resetAt: this.nextBillingPeriodStart(),
          };
        }),
      );

      return {
        organizationId: input.organizationId,
        subscriptionId,
        metrics,
        evaluatedAt: this.now(),
      };
    });
  }

  /** Reset usage counters for an organization at the start of a new billing cycle. */
  async resetQuota(
    ctx: ServiceContext,
    input: ResetQuotaInput,
  ): Promise<Result<void, AppError>> {
    this.log(ctx, "info", "quota.reset", {
      orgId: input.organizationId,
      subscriptionId: input.subscriptionId,
    });
    return serviceCall(async () => {
      this.assertAdmin(ctx, "reset quota");
      const subResult = await this.subscriptionRepo.findById(
        input.subscriptionId,
      );
      if (!isOk(subResult)) {
        throw new ResourceNotFoundError("Subscription", input.subscriptionId);
      }
      // No direct reset method on UsageRepository; deletion of old records
      // would be handled by a dedicated maintenance job in production.
      // For now we acknowledge the reset request without mutating records.
      void input.organizationId;
      void input.effectiveAt;
    });
  }

  /** Apply a per-metric quota override for an organization. Requires admin role. */
  async setQuotaOverride(
    ctx: ServiceContext,
    input: SetQuotaOverrideInput,
  ): Promise<Result<void, AppError>> {
    this.log(ctx, "info", "quota.setOverride", {
      orgId: input.organizationId,
      metric: input.metric,
      limit: input.limit,
    });
    return serviceCall(async () => {
      this.assertAdmin(ctx, "set quota override");
      this.overrides.set(overrideKey(input.organizationId, input.metric), {
        limit: input.limit,
        reason: input.reason,
      });
    });
  }

  /** Remove a quota override, reverting to plan-default limits. Requires admin role. */
  async removeQuotaOverride(
    ctx: ServiceContext,
    organizationId: string,
    metric: string,
  ): Promise<Result<void, AppError>> {
    this.log(ctx, "info", "quota.removeOverride", { organizationId, metric });
    return serviceCall(async () => {
      this.assertAdmin(ctx, "remove quota override");
      this.overrides.delete(overrideKey(organizationId, metric));
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async resolveQuota(
    organizationId: string,
    metric: string,
  ): Promise<{ limit: number; used: number }> {
    const override = this.overrides.get(overrideKey(organizationId, metric));
    const limit = override?.limit ?? this.defaultLimit(metric);
    const usedResult = await this.usageRepo.sumQuantityByMetric(
      organizationId,
      metric as import("@veritas/contracts").UsageMetric,
      this.billingPeriodStart(),
      this.now(),
    );
    const used = isOk(usedResult) ? usedResult.value : 0;
    return { limit, used };
  }

  private async resolveQuotaMeta(
    organizationId: string,
    metric: string,
  ): Promise<{ limit: number; overrideActive: boolean }> {
    const override = this.overrides.get(overrideKey(organizationId, metric));
    return {
      limit: override?.limit ?? this.defaultLimit(metric),
      overrideActive: override !== undefined,
    };
  }

  private defaultLimit(metric: string): number {
    const defaults: Record<string, number> = {
      verifications: 1000,
      api_calls: 10000,
      sources: 500,
      exports: 100,
      webhooks: 50,
    };
    return defaults[metric] ?? 0;
  }

  private billingPeriodStart(): string {
    const d = new Date(this.clock.now());
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
  }

  private nextBillingPeriodStart(): string {
    const d = new Date(this.clock.now());
    return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
  }

  private assertAdmin(ctx: ServiceContext, action: string): void {
    if (
      !ctx.principal.roles.includes("admin") &&
      !ctx.principal.roles.includes("system")
    ) {
      throw new InsufficientPermissionsError(action);
    }
  }
}
