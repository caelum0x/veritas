// Shared types for the retention module: record references, hold subjects, and purge outcomes.
import { z } from "zod";
import { RetentionCategorySchema, RetentionActionSchema } from "./policy.js";

/** A reference to a record that is subject to retention evaluation. */
export const RecordRefSchema = z.object({
  /** Unique record identifier within the system. */
  id: z.string().min(1),
  /** The retention category this record belongs to. */
  category: RetentionCategorySchema,
  /** ISO-8601 timestamp when the record was created. */
  createdAt: z.string(),
  /** Optional ISO-8601 timestamp to override expiry calculation (e.g. last modified). */
  anchorAt: z.string().optional(),
  /** Arbitrary key-value metadata for classifier hints. */
  metadata: z.record(z.unknown()).optional(),
});
export type RecordRef = z.infer<typeof RecordRefSchema>;

/** Result produced by the purge engine for a single record. */
export const PurgeOutcomeSchema = z.object({
  recordId: z.string(),
  category: RetentionCategorySchema,
  action: RetentionActionSchema,
  /** ISO timestamp when the action was performed. */
  performedAt: z.string(),
  /** True when the record was under a legal hold and was skipped. */
  skippedDueToHold: z.boolean().default(false),
  /** Policy id that triggered this outcome. */
  policyId: z.string(),
  error: z.string().optional(),
});
export type PurgeOutcome = z.infer<typeof PurgeOutcomeSchema>;

/** Summary statistics produced by one purge run. */
export const PurgeRunSummarySchema = z.object({
  runId: z.string(),
  startedAt: z.string(),
  finishedAt: z.string(),
  totalEvaluated: z.number().int().min(0),
  totalActioned: z.number().int().min(0),
  totalSkipped: z.number().int().min(0),
  totalErrors: z.number().int().min(0),
  outcomes: z.array(PurgeOutcomeSchema),
});
export type PurgeRunSummary = z.infer<typeof PurgeRunSummarySchema>;

/** Status of a legal hold. */
export const LegalHoldStatusSchema = z.enum(["active", "released"]);
export type LegalHoldStatus = z.infer<typeof LegalHoldStatusSchema>;

/** Expiry evaluation result for a single record. */
export const ExpiryEvaluationSchema = z.object({
  recordId: z.string(),
  category: RetentionCategorySchema,
  policyId: z.string().nullable(),
  /** ISO timestamp when the record expires, or null if retained forever. */
  expiresAt: z.string().nullable(),
  /** Whether the record is currently expired relative to the evaluation time. */
  isExpired: z.boolean(),
  /** Whether the record is protected by an active legal hold. */
  isOnHold: z.boolean(),
  /** Action that would be applied if expiry is triggered. */
  action: RetentionActionSchema.nullable(),
});
export type ExpiryEvaluation = z.infer<typeof ExpiryEvaluationSchema>;
