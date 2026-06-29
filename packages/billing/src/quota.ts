// Quota enforcement: check and consume per-organization usage limits per billing period.

import { Id, IsoTimestamp, Result, ok, err, Logger, noopLogger } from "@veritas/core";
import { UsageMetricSchema } from "@veritas/contracts";
import { z } from "zod";
import { type Plan, getLimitForMetric } from "./plans.js";
import { type PeriodUsage } from "./usage-aggregator.js";
import { QuotaExceededError } from "./errors.js";

export type UsageMetric = z.infer<typeof UsageMetricSchema>;

export interface QuotaStatus {
  readonly organizationId: Id<string>;
  readonly metric: UsageMetric;
  readonly periodStart: IsoTimestamp;
  readonly periodEnd: IsoTimestamp;
  readonly used: number;
  readonly limit: number | null;
  readonly remaining: number | null;
  readonly isExceeded: boolean;
  readonly isUnlimited: boolean;
}

export interface QuotaCheckRequest {
  readonly organizationId: Id<string>;
  readonly metric: UsageMetric;
  readonly quantity: number;
  readonly periodStart: IsoTimestamp;
  readonly periodEnd: IsoTimestamp;
}

export interface QuotaEnforcerOptions {
  readonly logger?: Logger;
}

/**
 * QuotaEnforcer evaluates plan limits against aggregated usage.
 * It is stateless with respect to usage — callers supply current period totals.
 */
export class QuotaEnforcer {
  private readonly logger: Logger;

  constructor(opts: QuotaEnforcerOptions = {}) {
    this.logger = opts.logger ?? noopLogger;
  }

  /** Compute quota status for a specific metric given current period usage. */
  statusFor(
    plan: Plan,
    organizationId: Id<string>,
    metric: UsageMetric,
    currentUsage: PeriodUsage | undefined
  ): QuotaStatus {
    const limit = getLimitForMetric(plan, metric);
    const maxPerPeriod = limit?.maxPerPeriod ?? null;
    const used = currentUsage?.totalQuantity ?? 0;
    const isUnlimited = maxPerPeriod === null;
    const remaining = isUnlimited ? null : Math.max(0, maxPerPeriod! - used);
    const isExceeded = !isUnlimited && used > maxPerPeriod!;
    const periodStart =
      currentUsage?.periodStart ?? ("" as IsoTimestamp);
    const periodEnd =
      currentUsage?.periodEnd ?? ("" as IsoTimestamp);

    return {
      organizationId,
      metric,
      periodStart,
      periodEnd,
      used,
      limit: maxPerPeriod,
      remaining,
      isExceeded,
      isUnlimited,
    };
  }

  /**
   * Check whether adding `quantity` units would exceed the plan limit.
   * Returns ok(QuotaStatus) if within limits, err(QuotaExceededError) otherwise.
   */
  check(
    plan: Plan,
    organizationId: Id<string>,
    request: QuotaCheckRequest,
    currentUsage: PeriodUsage | undefined
  ): Result<QuotaStatus, QuotaExceededError> {
    const limit = getLimitForMetric(plan, request.metric);
    if (!limit || limit.maxPerPeriod === null) {
      // Unlimited — always allow.
      const status: QuotaStatus = {
        organizationId,
        metric: request.metric,
        periodStart: request.periodStart,
        periodEnd: request.periodEnd,
        used: (currentUsage?.totalQuantity ?? 0) + request.quantity,
        limit: null,
        remaining: null,
        isExceeded: false,
        isUnlimited: true,
      };
      return ok(status);
    }

    const usedBefore = currentUsage?.totalQuantity ?? 0;
    const usedAfter = usedBefore + request.quantity;
    const isExceeded = usedAfter > limit.maxPerPeriod;

    const status: QuotaStatus = {
      organizationId,
      metric: request.metric,
      periodStart: request.periodStart,
      periodEnd: request.periodEnd,
      used: usedAfter,
      limit: limit.maxPerPeriod,
      remaining: Math.max(0, limit.maxPerPeriod - usedAfter),
      isExceeded,
      isUnlimited: false,
    };

    if (isExceeded) {
      this.logger.warn("quota.exceeded", {
        organizationId,
        metric: request.metric,
        used: usedAfter,
        limit: limit.maxPerPeriod,
      });
      return err(
        new QuotaExceededError(
          request.metric,
          usedAfter,
          limit.maxPerPeriod,
          organizationId
        )
      );
    }

    return ok(status);
  }

  /**
   * Compute quota statuses for all metrics defined in the plan for an organization.
   */
  allStatuses(
    plan: Plan,
    organizationId: Id<string>,
    periodUsages: readonly PeriodUsage[]
  ): readonly QuotaStatus[] {
    const usageByMetric = new Map<UsageMetric, PeriodUsage>();
    for (const u of periodUsages) {
      if (u.organizationId === organizationId) {
        usageByMetric.set(u.metric, u);
      }
    }

    return plan.limits.map((limit) =>
      this.statusFor(plan, organizationId, limit.metric, usageByMetric.get(limit.metric))
    );
  }

  /** Return true only if every metric is within its plan limit. */
  isCompliant(
    plan: Plan,
    organizationId: Id<string>,
    periodUsages: readonly PeriodUsage[]
  ): boolean {
    return this.allStatuses(plan, organizationId, periodUsages).every(
      (s) => !s.isExceeded
    );
  }
}
