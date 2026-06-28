// Public verification report contract (v1) — the engine's structured output shape.
// NOTE: kept Anthropic structured-output friendly (no min/max length on adjudication).

import { z } from "zod";
import { verdictSchema } from "@veritas/core";

/** A citation as emitted inside the public report. */
export const ReportCitationSchema = z.object({
  url: z.string(),
  title: z.string().nullable(),
  quote: z.string().nullable(),
  supports: z.boolean(),
});
export type ReportCitation = z.infer<typeof ReportCitationSchema>;

/** A single adjudicated claim within the public report. */
export const VerificationReportClaimSchema = z.object({
  claim: z.string(),
  verdict: verdictSchema,
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  citations: z.array(ReportCitationSchema),
});
export type VerificationReportClaim = z.infer<
  typeof VerificationReportClaimSchema
>;

/** Provenance block embedded in the public report. */
export const ReportProvenanceSchema = z.object({
  contentHash: z.string(),
  verifier: z.string(),
  verifierVersion: z.string(),
  model: z.string(),
  effort: z.string(),
  createdAt: z.string(),
  claimCount: z.number().int().min(0),
  sourceCount: z.number().int().min(0),
});
export type ReportProvenance = z.infer<typeof ReportProvenanceSchema>;

/** Aggregate verdict counts. */
export const VerificationReportCountsSchema = z.object({
  supported: z.number().int().min(0),
  refuted: z.number().int().min(0),
  unverifiable: z.number().int().min(0),
});
export type VerificationReportCounts = z.infer<
  typeof VerificationReportCountsSchema
>;

/** The full public v1 verification report. */
export const VerificationReportSchema = z.object({
  schema: z.literal("veritas.report.v1"),
  summary: z.string(),
  trustScore: z.number().min(0).max(100),
  counts: VerificationReportCountsSchema,
  claims: z.array(VerificationReportClaimSchema),
  provenance: ReportProvenanceSchema,
});
export type VerificationReport = z.infer<typeof VerificationReportSchema>;
