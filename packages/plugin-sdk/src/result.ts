// PluginResult — structured output returned by a plugin's verify() method.
import { z } from "zod";
import {
  type Score,
  type ContentHash,
  type Verdict,
  scoreSchema,
  verdictSchema,
  contentHashSchema,
} from "@veritas/core";

// ---------------------------------------------------------------------------
// Evidence item
// ---------------------------------------------------------------------------

/** A single piece of evidence collected by the plugin during verification. */
export interface PluginEvidence {
  /** Human-readable label for this evidence item. */
  readonly label: string;
  /** URL or URN pointing to the primary source. */
  readonly sourceRef: string;
  /** Optional verbatim excerpt from the source. */
  readonly excerpt?: string;
  /** Confidence that this evidence is relevant and accurate (0–1). */
  readonly confidence: Score;
}

export const pluginEvidenceSchema = z.object({
  label: z.string().min(1),
  sourceRef: z.string().min(1),
  excerpt: z.string().optional(),
  confidence: scoreSchema.transform((v) => v as Score),
});

// ---------------------------------------------------------------------------
// Provenance record
// ---------------------------------------------------------------------------

/** Minimal provenance emitted by the plugin for audit-trail purposes. */
export interface PluginProvenance {
  /** Content hash of the input the plugin acted upon. */
  readonly inputHash: ContentHash;
  /** ISO-8601 timestamp when the plugin ran. */
  readonly executedAt: string;
  /** Optional on-chain transaction reference (tx hash / CID). */
  readonly onChainRef?: string;
}

export const pluginProvenanceSchema = z.object({
  inputHash: contentHashSchema.transform((v) => v as ContentHash),
  executedAt: z.string().datetime(),
  onChainRef: z.string().optional(),
});

// ---------------------------------------------------------------------------
// PluginResult
// ---------------------------------------------------------------------------

/**
 * Complete output from one plugin verification run.
 * The host aggregates these across plugins to produce the final report.
 */
export interface PluginResult {
  /** Aggregate verdict reached by this plugin. */
  readonly verdict: Verdict;
  /** Overall confidence score for the verdict (0–1). */
  readonly score: Score;
  /** Evidence items collected during verification. */
  readonly evidence: ReadonlyArray<PluginEvidence>;
  /** Provenance data for this run. */
  readonly provenance: PluginProvenance;
  /** Optional human-readable rationale explaining the verdict. */
  readonly rationale?: string;
  /** Plugin-specific metadata (arbitrary, must be JSON-serialisable). */
  readonly meta: Readonly<Record<string, unknown>>;
}

export const pluginResultSchema = z.object({
  verdict: verdictSchema.transform((v) => v as Verdict),
  score: scoreSchema.transform((v) => v as Score),
  evidence: z.array(pluginEvidenceSchema),
  provenance: pluginProvenanceSchema,
  rationale: z.string().optional(),
  meta: z.record(z.unknown()),
});

// ---------------------------------------------------------------------------
// Factory helper
// ---------------------------------------------------------------------------

/** Construct a PluginResult with defaults for optional fields. */
export function makePluginResult(
  partial: Omit<PluginResult, "meta"> & { meta?: Record<string, unknown> },
): PluginResult {
  return {
    verdict: partial.verdict,
    score: partial.score,
    evidence: partial.evidence,
    provenance: partial.provenance,
    rationale: partial.rationale,
    meta: Object.freeze(partial.meta ?? {}),
  };
}
