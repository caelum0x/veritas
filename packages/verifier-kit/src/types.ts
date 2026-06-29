// types.ts: shared primitive types and enumerations for verifier-kit.
import { z } from "zod";
import { isoTimestampSchema, scoreSchema, verdictSchema } from "@veritas/core";
import type { IsoTimestamp, Score, Verdict } from "@veritas/core";

/** Unique identifier for a specialized verifier instance. */
export type VerifierId = string & { readonly __brand: "VerifierId" };

export function asVerifierId(s: string): VerifierId {
  return s as VerifierId;
}

/** Domain categories a verifier may cover. */
export const ClaimDomainSchema = z.enum([
  "financial",
  "scientific",
  "medical",
  "legal",
  "news",
  "crypto",
  "general",
]);
export type ClaimDomain = z.infer<typeof ClaimDomainSchema>;

/** Confidence level attached to a verdict signal. */
export const ConfidenceLevelSchema = z.enum(["very_low", "low", "medium", "high", "very_high"]);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

/** A structured claim presented to specialized verifiers. */
export const VerifiableClaimSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  domain: ClaimDomainSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
  submittedAt: isoTimestampSchema as unknown as z.ZodType<IsoTimestamp>,
});
export type VerifiableClaim = z.infer<typeof VerifiableClaimSchema>;

/** Per-source fetch options forwarded by the context. */
export const FetchOptionsSchema = z.object({
  timeoutMs: z.number().int().positive().default(10_000),
  maxRetries: z.number().int().nonnegative().default(2),
  bypassCache: z.boolean().default(false),
});
export type FetchOptions = z.infer<typeof FetchOptionsSchema>;

/** Lightweight wrapper around an aggregated verdict signal score. */
export const SignalWeightSchema = z.object({
  verifierId: z.string(),
  domain: ClaimDomainSchema,
  weight: z.number().min(0).max(1),
});
export type SignalWeight = z.infer<typeof SignalWeightSchema>;

/** Summary of aggregated signals heading into the core engine. */
export const AggregatedVerdictSchema = z.object({
  verdict: verdictSchema as unknown as z.ZodType<Verdict>,
  score: scoreSchema as unknown as z.ZodType<Score>,
  confidence: ConfidenceLevelSchema,
  signalCount: z.number().int().nonnegative(),
  aggregatedAt: isoTimestampSchema as unknown as z.ZodType<IsoTimestamp>,
});
export type AggregatedVerdict = z.infer<typeof AggregatedVerdictSchema>;

/** Cache entry wrapper. */
export interface CacheEntry<T> {
  readonly value: T;
  readonly storedAt: IsoTimestamp;
  readonly ttlMs: number;
}

/** Rate-control token bucket configuration. */
export const RateLimitConfigSchema = z.object({
  requestsPerSecond: z.number().positive(),
  burstCapacity: z.number().int().positive(),
});
export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;
