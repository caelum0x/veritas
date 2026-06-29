// Maps between domain Subscription objects and HTTP response shapes.

import type { Subscription } from "@veritas/contracts";
import type { Plan } from "@veritas/billing";

export interface SubscriptionResponse {
  readonly id: string;
  readonly organizationId: string;
  readonly planId: string;
  readonly status: string;
  readonly currentPeriodStart: string;
  readonly currentPeriodEnd: string;
  readonly cancelAtPeriodEnd: boolean;
  readonly cancelledAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PlanResponse {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly interval: string;
  readonly basePriceUsdc: string;
  readonly features: readonly string[];
  readonly trialDays: number;
  readonly isActive: boolean;
  readonly limits: ReadonlyArray<{
    readonly metric: string;
    readonly maxPerPeriod: number | null;
    readonly includedUnits: number;
  }>;
}

export function toSubscriptionResponse(sub: Subscription): SubscriptionResponse {
  return {
    id: sub.id,
    organizationId: sub.organizationId,
    planId: sub.planId,
    status: sub.status,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    cancelledAt: sub.cancelledAt,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
  };
}

export function toPlanResponse(plan: Plan): PlanResponse {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    interval: plan.interval,
    basePriceUsdc: plan.basePrice.toString(),
    features: plan.features,
    trialDays: plan.trialDays,
    isActive: plan.isActive,
    limits: plan.limits.map((l) => ({
      metric: l.metric,
      maxPerPeriod: l.maxPerPeriod,
      includedUnits: l.includedUnits,
    })),
  };
}
