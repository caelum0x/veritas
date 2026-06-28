// Trial policy definitions controlling duration, extensions, and eligibility rules.

import { z } from "zod";
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import { ValidationError } from "@veritas/core";

/** Validated trial policy configuration. */
export interface TrialPolicy {
  readonly planId: string;
  readonly durationDays: number;
  readonly maxExtensions: number;
  readonly maxExtensionDays: number;
  readonly allowedOnce: boolean;
  readonly requiresCreditCard: boolean;
}

const trialPolicySchema = z.object({
  planId: z.string().min(1),
  durationDays: z.number().int().min(1).max(365),
  maxExtensions: z.number().int().min(0).max(10),
  maxExtensionDays: z.number().int().min(0).max(90),
  allowedOnce: z.boolean(),
  requiresCreditCard: z.boolean(),
});

/** Default policy registry keyed by planId. */
const DEFAULT_POLICIES: ReadonlyMap<string, TrialPolicy> = new Map([
  [
    "starter",
    {
      planId: "starter",
      durationDays: 14,
      maxExtensions: 1,
      maxExtensionDays: 7,
      allowedOnce: true,
      requiresCreditCard: false,
    },
  ],
  [
    "pro",
    {
      planId: "pro",
      durationDays: 30,
      maxExtensions: 2,
      maxExtensionDays: 14,
      allowedOnce: true,
      requiresCreditCard: false,
    },
  ],
  [
    "enterprise",
    {
      planId: "enterprise",
      durationDays: 60,
      maxExtensions: 3,
      maxExtensionDays: 30,
      allowedOnce: false,
      requiresCreditCard: false,
    },
  ],
]);

/** Parse and validate a raw policy object. */
export function parsePolicy(
  raw: unknown
): Result<TrialPolicy, ValidationError> {
  const parsed = trialPolicySchema.safeParse(raw);
  if (!parsed.success) {
    return err(
      new ValidationError({
        message: "Invalid trial policy",
        details: { issues: parsed.error.issues },
      })
    );
  }
  return ok(parsed.data);
}

/** Look up a policy for a given planId from the default registry. */
export function getPolicyForPlan(
  planId: string
): Result<TrialPolicy, ValidationError> {
  const policy = DEFAULT_POLICIES.get(planId);
  if (policy === undefined) {
    return err(
      new ValidationError({
        message: `No trial policy found for plan '${planId}'`,
        details: { planId },
      })
    );
  }
  return ok(policy);
}

/** Build a custom policy registry from a list of policies. */
export function buildPolicyRegistry(
  policies: readonly TrialPolicy[]
): ReadonlyMap<string, TrialPolicy> {
  return new Map(policies.map((p) => [p.planId, p]));
}
