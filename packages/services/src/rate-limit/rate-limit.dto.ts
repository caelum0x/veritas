// Input/output DTOs for rate-limit application service use-cases.
import { z } from "zod";

/** Supported rate-limit window granularities. */
export const RateLimitWindowSchema = z.enum(["SECOND", "MINUTE", "HOUR", "DAY"]);
export type RateLimitWindow = z.infer<typeof RateLimitWindowSchema>;

/** Input for checking whether a subject has exceeded a named rate limit. */
export const CheckRateLimitInputSchema = z.object({
  /** Logical name of the rate-limit rule (e.g. "api:verify", "agent:settle"). */
  limitKey: z.string().min(1).max(128),
  /** Identifier for the subject being rate-limited (userId, orgId, apiKeyId, etc.). */
  subjectId: z.string().min(1),
  /** Maximum number of operations allowed within the window. */
  maxRequests: z.number().int().positive(),
  /** Time window granularity. */
  window: RateLimitWindowSchema,
  /** How many tokens this single operation consumes (default 1). */
  cost: z.number().int().positive().default(1),
});
export type CheckRateLimitInput = z.infer<typeof CheckRateLimitInputSchema>;

/** Input for resetting (clearing) the counter for a subject+limitKey pair. */
export const ResetRateLimitInputSchema = z.object({
  limitKey: z.string().min(1).max(128),
  subjectId: z.string().min(1),
});
export type ResetRateLimitInput = z.infer<typeof ResetRateLimitInputSchema>;

/** Input for retrieving current usage stats for a subject+limitKey pair. */
export const GetRateLimitStatusInputSchema = z.object({
  limitKey: z.string().min(1).max(128),
  subjectId: z.string().min(1),
  window: RateLimitWindowSchema,
});
export type GetRateLimitStatusInput = z.infer<typeof GetRateLimitStatusInputSchema>;

/** The current state of a rate-limit slot for a subject. */
export const RateLimitStatusOutputSchema = z.object({
  limitKey: z.string(),
  subjectId: z.string(),
  consumed: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  window: RateLimitWindowSchema,
  resetsAt: z.string().datetime(),
  isExceeded: z.boolean(),
});
export type RateLimitStatusOutput = z.infer<typeof RateLimitStatusOutputSchema>;

/** The result of a single rate-limit check operation. */
export const RateLimitCheckResultSchema = z.object({
  allowed: z.boolean(),
  status: RateLimitStatusOutputSchema,
});
export type RateLimitCheckResult = z.infer<typeof RateLimitCheckResultSchema>;
