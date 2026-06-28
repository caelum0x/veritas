// Idempotency policy — configures which routes require idempotency keys and TTLs.
import { z } from "zod";

export const idempotencyPolicySchema = z.object({
  /** HTTP methods that require an idempotency key. */
  requiredMethods: z.array(z.string().toUpperCase()).default(["POST", "PUT", "PATCH"]),
  /** Route path prefixes where idempotency is enforced. Empty = all routes. */
  routePrefixes: z.array(z.string()).default([]),
  /** Route path prefixes explicitly excluded from enforcement. */
  excludedPrefixes: z.array(z.string()).default(["/health", "/metrics"]),
  /** TTL for stored idempotency records in milliseconds. */
  recordTtlMs: z.number().int().positive().default(86_400_000), // 24 hours
  /** TTL for in-flight locks in milliseconds. */
  lockTtlMs: z.number().int().positive().default(30_000), // 30 seconds
  /** Whether to require the key on matching routes (vs. honour if present). */
  strict: z.boolean().default(true),
});

export type IdempotencyPolicy = z.infer<typeof idempotencyPolicySchema>;

export const DEFAULT_POLICY: IdempotencyPolicy = idempotencyPolicySchema.parse({});

/** Determine whether a given method + path combination requires idempotency handling. */
export function policyAppliesToRequest(
  policy: IdempotencyPolicy,
  method: string,
  path: string,
): boolean {
  const upper = method.toUpperCase();
  if (!policy.requiredMethods.includes(upper)) return false;

  for (const prefix of policy.excludedPrefixes) {
    if (path.startsWith(prefix)) return false;
  }

  if (policy.routePrefixes.length === 0) return true;

  for (const prefix of policy.routePrefixes) {
    if (path.startsWith(prefix)) return true;
  }

  return false;
}

/** Build a policy by merging partial overrides onto the default policy. */
export function buildPolicy(overrides: Partial<IdempotencyPolicy> = {}): IdempotencyPolicy {
  return idempotencyPolicySchema.parse({ ...DEFAULT_POLICY, ...overrides });
}
