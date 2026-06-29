// Credit policy: rules governing grant limits, expiry windows, and consumption caps.

import { z } from "zod";
import { type CreditSource } from "./credit.js";

/** Policy governing a single credit source. */
export interface SourcePolicy {
  readonly source: CreditSource;
  /** Maximum credits grantable per source per day (null = unlimited). */
  readonly maxPerDay: number | null;
  /** How many days until credits from this source expire (null = never). */
  readonly expiryDays: number | null;
  /** Whether credits from this source can be reserved. */
  readonly reservable: boolean;
}

export const sourcePolicySchema = z.object({
  source: z.enum(["purchase", "promotional", "referral", "trial", "adjustment"]),
  maxPerDay: z.number().int().positive().nullable(),
  expiryDays: z.number().int().positive().nullable(),
  reservable: z.boolean(),
});

/** Overall credit policy configuration for a deployment. */
export interface CreditPolicy {
  readonly sourcePolicies: ReadonlyArray<SourcePolicy>;
  /** Global maximum reserved credits a user may hold at once (null = unlimited). */
  readonly maxReservedPerUser: number | null;
  /** Global maximum available credits a user may hold at once (null = unlimited). */
  readonly maxBalancePerUser: number | null;
}

export const creditPolicySchema = z.object({
  sourcePolicies: z.array(sourcePolicySchema),
  maxReservedPerUser: z.number().int().positive().nullable(),
  maxBalancePerUser: z.number().int().positive().nullable(),
});

/** Default permissive policy for development/testing. */
export const defaultCreditPolicy: CreditPolicy = Object.freeze({
  sourcePolicies: Object.freeze([
    Object.freeze({ source: "purchase" as CreditSource, maxPerDay: null, expiryDays: null, reservable: true }),
    Object.freeze({ source: "promotional" as CreditSource, maxPerDay: 1_000_000, expiryDays: 90, reservable: false }),
    Object.freeze({ source: "referral" as CreditSource, maxPerDay: 500_000, expiryDays: 365, reservable: true }),
    Object.freeze({ source: "trial" as CreditSource, maxPerDay: 100_000, expiryDays: 30, reservable: false }),
    Object.freeze({ source: "adjustment" as CreditSource, maxPerDay: null, expiryDays: null, reservable: true }),
  ] as ReadonlyArray<SourcePolicy>),
  maxReservedPerUser: null,
  maxBalancePerUser: null,
});

/** Look up the policy for a specific source (falls back to a permissive default). */
export function getPolicyForSource(
  policy: CreditPolicy,
  source: CreditSource,
): SourcePolicy {
  const found = policy.sourcePolicies.find((p) => p.source === source);
  return found ?? Object.freeze({ source, maxPerDay: null, expiryDays: null, reservable: true });
}

/** Compute expiry date string from grant date using policy (returns null if never-expiring). */
export function computeExpiryDate(
  policy: SourcePolicy,
  grantedAt: string,
): string | null {
  if (policy.expiryDays === null) return null;
  const base = new Date(grantedAt);
  base.setUTCDate(base.getUTCDate() + policy.expiryDays);
  return base.toISOString();
}

/** Check whether a reservation is allowed under policy for a given source. */
export function isReservationAllowedByPolicy(
  policy: CreditPolicy,
  source: CreditSource,
): boolean {
  return getPolicyForSource(policy, source).reservable;
}
