// Evaluation context passed to flag resolution
import { z } from "zod";

/** Attributes for targeting rules — arbitrary key/value pairs */
export const EvaluationContextSchema = z.object({
  /** Stable identifier used for rollout bucketing (user ID, org ID, etc.) */
  key: z.string().min(1),
  /** Optional tenant/organization identifier for override lookup */
  tenantId: z.string().optional(),
  /** Optional user identifier */
  userId: z.string().optional(),
  /** Optional email for targeting rules */
  email: z.string().optional(),
  /** Optional plan for targeting rules */
  plan: z.string().optional(),
  /** Optional environment label (production, staging, etc.) */
  environment: z.string().optional(),
  /** Arbitrary additional attributes */
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export type EvaluationContext = z.infer<typeof EvaluationContextSchema>;

/** Create a minimal context from a stable key */
export function makeContext(
  key: string,
  overrides: Partial<Omit<EvaluationContext, "key">> = {}
): EvaluationContext {
  return { key, ...overrides };
}
