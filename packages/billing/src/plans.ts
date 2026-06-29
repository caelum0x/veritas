// Plans: plan catalog definitions with limits and feature flags for billing.

import { Usdc, USDC_DECIMALS } from "@veritas/core";
import { z } from "zod";
import { UsageMetricSchema } from "@veritas/contracts";

export type UsageMetric = z.infer<typeof UsageMetricSchema>;

export type BillingInterval = "monthly" | "annual";

export interface PlanLimit {
  readonly metric: UsageMetric;
  /** Maximum units per billing period; null means unlimited. */
  readonly maxPerPeriod: number | null;
  /** Included units before metered billing kicks in. */
  readonly includedUnits: number;
}

export interface Plan {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly interval: BillingInterval;
  /** Base price in USDC micro-units (6 decimals). */
  readonly basePrice: bigint;
  readonly limits: readonly PlanLimit[];
  readonly features: readonly string[];
  readonly isActive: boolean;
  readonly trialDays: number;
}

function usdc(dollars: number): bigint {
  return BigInt(Math.round(dollars * 10 ** USDC_DECIMALS));
}

const STARTER_LIMITS: PlanLimit[] = [
  { metric: "VERIFICATIONS", maxPerPeriod: 1_000, includedUnits: 100 },
  { metric: "CLAIMS", maxPerPeriod: 10_000, includedUnits: 1_000 },
  { metric: "TOKENS", maxPerPeriod: 1_000_000, includedUnits: 100_000 },
  { metric: "SOURCES", maxPerPeriod: 50, includedUnits: 10 },
];

const PRO_LIMITS: PlanLimit[] = [
  { metric: "VERIFICATIONS", maxPerPeriod: 20_000, includedUnits: 2_000 },
  { metric: "CLAIMS", maxPerPeriod: 200_000, includedUnits: 10_000 },
  { metric: "TOKENS", maxPerPeriod: 20_000_000, includedUnits: 2_000_000 },
  { metric: "SOURCES", maxPerPeriod: 500, includedUnits: 100 },
];

const ENTERPRISE_LIMITS: PlanLimit[] = [
  { metric: "VERIFICATIONS", maxPerPeriod: null, includedUnits: 50_000 },
  { metric: "CLAIMS", maxPerPeriod: null, includedUnits: 500_000 },
  { metric: "TOKENS", maxPerPeriod: null, includedUnits: 50_000_000 },
  { metric: "SOURCES", maxPerPeriod: null, includedUnits: 5_000 },
];

export const PLAN_CATALOG: readonly Plan[] = [
  {
    id: "starter-monthly",
    name: "Starter",
    description: "For individuals and small teams exploring fact verification.",
    interval: "monthly",
    basePrice: usdc(49),
    limits: STARTER_LIMITS,
    features: ["REST API access", "SDK access", "Community support"],
    isActive: true,
    trialDays: 14,
  },
  {
    id: "pro-monthly",
    name: "Pro",
    description: "For growing teams requiring higher throughput and priority support.",
    interval: "monthly",
    basePrice: usdc(299),
    limits: PRO_LIMITS,
    features: [
      "REST API access",
      "SDK access",
      "CAP agent access",
      "Priority support",
      "Webhooks",
      "Audit logs",
    ],
    isActive: true,
    trialDays: 14,
  },
  {
    id: "enterprise-monthly",
    name: "Enterprise",
    description: "Unlimited scale, SLA guarantees, and dedicated support.",
    interval: "monthly",
    basePrice: usdc(1999),
    limits: ENTERPRISE_LIMITS,
    features: [
      "REST API access",
      "SDK access",
      "CAP agent access",
      "Dedicated support",
      "Webhooks",
      "Audit logs",
      "Custom integrations",
      "SLA",
    ],
    isActive: true,
    trialDays: 30,
  },
] as const;

export function getPlanById(id: string): Plan | undefined {
  return PLAN_CATALOG.find((p) => p.id === id);
}

export function getLimitForMetric(
  plan: Plan,
  metric: UsageMetric
): PlanLimit | undefined {
  return plan.limits.find((l) => l.metric === metric);
}

export function isWithinLimit(
  plan: Plan,
  metric: UsageMetric,
  quantity: number
): boolean {
  const limit = getLimitForMetric(plan, metric);
  if (!limit) return true;
  if (limit.maxPerPeriod === null) return true;
  return quantity <= limit.maxPerPeriod;
}
