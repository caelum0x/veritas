// Per-route and per-plan rate-limit policies — maps routes/plans to limiter options.
import type { LimiterOptions } from "./limiter.js";

export type Algorithm = "fixed-window" | "sliding-window" | "token-bucket" | "leaky-bucket";

export interface Policy {
  readonly algorithm: Algorithm;
  readonly windowMs: number;
  readonly max: number;
  /** Optional: burst allowance on top of max (token-bucket only). */
  readonly burst?: number;
  /** Optional: requests per second drain rate (leaky-bucket only). */
  readonly drainRatePerSec?: number;
}

export interface PolicyEntry {
  readonly route?: string;      // undefined = catch-all
  readonly planId?: string;     // undefined = applies to all plans
  readonly policy: Policy;
}

export interface PolicyRegistry {
  resolve(route: string, planId?: string): Policy;
  register(entry: PolicyEntry): PolicyRegistry;
}

const DEFAULT_POLICY: Policy = {
  algorithm: "sliding-window",
  windowMs: 60_000,
  max: 60,
};

export function createPolicyRegistry(
  entries: readonly PolicyEntry[] = [],
  fallback: Policy = DEFAULT_POLICY
): PolicyRegistry {
  let registry: readonly PolicyEntry[] = entries;

  function resolve(route: string, planId?: string): Policy {
    // Most specific match first: route + plan
    const exactMatch = registry.find(
      (e) => e.route === route && e.planId === planId
    );
    if (exactMatch != null) return exactMatch.policy;

    // Route match without plan specificity
    const routeMatch = registry.find(
      (e) => e.route === route && e.planId == null
    );
    if (routeMatch != null) return routeMatch.policy;

    // Plan-only match (all routes for this plan)
    if (planId != null) {
      const planMatch = registry.find(
        (e) => e.route == null && e.planId === planId
      );
      if (planMatch != null) return planMatch.policy;
    }

    // Catch-all
    const catchAll = registry.find((e) => e.route == null && e.planId == null);
    if (catchAll != null) return catchAll.policy;

    return fallback;
  }

  function register(entry: PolicyEntry): PolicyRegistry {
    registry = [...registry, entry];
    return { resolve, register };
  }

  return { resolve, register };
}

/** Convert a Policy to LimiterOptions (common subset). */
export function policyToLimiterOptions(policy: Policy): LimiterOptions {
  return { windowMs: policy.windowMs, max: policy.max };
}
