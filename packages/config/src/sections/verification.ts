// Verification engine tuning configuration section.
import { z } from "zod";

export const VerificationConfigSchema = z.object({
  /** Minimum confidence score (0–1) for a claim to be considered verified. */
  minConfidenceThreshold: z.number().min(0).max(1).default(0.7),
  /** Maximum number of sources fetched per claim during evidence gathering. */
  maxSourcesPerClaim: z.number().int().positive().default(10),
  /** Timeout in milliseconds for a single source fetch. */
  sourceFetchTimeoutMs: z.number().int().positive().default(8_000),
  /** Maximum total wall-clock time in milliseconds for a full verification job. */
  jobTimeoutMs: z.number().int().positive().default(120_000),
  /** Number of concurrent HTTP requests allowed during evidence gathering. */
  fetchConcurrency: z.number().int().min(1).max(50).default(5),
  /** Maximum number of retry attempts for transient fetch failures. */
  fetchMaxRetries: z.number().int().min(0).max(10).default(3),
  /** Weight applied to primary-tier sources when computing the aggregate score. */
  primarySourceWeight: z.number().min(0).max(1).default(1.0),
  /** Weight applied to secondary-tier sources when computing the aggregate score. */
  secondarySourceWeight: z.number().min(0).max(1).default(0.6),
  /** Weight applied to tertiary-tier sources when computing the aggregate score. */
  tertiarySourceWeight: z.number().min(0).max(1).default(0.3),
  /** Enable semantic similarity deduplication of gathered evidence. */
  deduplicateEvidence: z.boolean().default(true),
  /** Cosine similarity threshold above which two evidence pieces are considered duplicates. */
  deduplicationThreshold: z.number().min(0).max(1).default(0.92),
  /** Maximum length (characters) of claim text accepted for verification. */
  maxClaimLength: z.number().int().positive().default(2_000),
  /** Enable caching of source fetch results to speed up repeated verifications. */
  enableFetchCache: z.boolean().default(true),
  /** TTL in seconds for cached source fetch results. */
  fetchCacheTtlSeconds: z.number().int().positive().default(3_600),
});

export type VerificationConfig = z.infer<typeof VerificationConfigSchema>;

export const defaultVerificationConfig: VerificationConfig =
  VerificationConfigSchema.parse({});
