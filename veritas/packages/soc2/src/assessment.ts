// Control assessment: evaluates whether a control is designed and operating effectively.

import { z } from "zod";
import { type IsoTimestamp, isoTimestampSchema } from "@veritas/core";
import { type Control } from "./control.js";
import { type Evidence, filterAcceptedEvidence } from "./evidence.js";

export const AssessmentTypeSchema = z.enum([
  "design_effectiveness",
  "operating_effectiveness",
  "full",
]);
export type AssessmentType = z.infer<typeof AssessmentTypeSchema>;

export const AssessmentOutcomeSchema = z.enum([
  "effective",
  "ineffective",
  "partially_effective",
  "not_tested",
]);
export type AssessmentOutcome = z.infer<typeof AssessmentOutcomeSchema>;

export const AssessmentStatusSchema = z.enum([
  "planned",
  "in_progress",
  "completed",
  "cancelled",
]);
export type AssessmentStatus = z.infer<typeof AssessmentStatusSchema>;

export const AssessorSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  role: z.enum(["internal_auditor", "external_auditor", "control_owner", "management"]),
});
export type Assessor = z.infer<typeof AssessorSchema>;

export const AssessmentConclusionSchema = z.object({
  outcome: AssessmentOutcomeSchema,
  summary: z.string().min(1),
  deficiencies: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
});
export type AssessmentConclusion = z.infer<typeof AssessmentConclusionSchema>;

export const AssessmentSchema = z.object({
  id: z.string().min(1),
  controlId: z.string().min(1),
  type: AssessmentTypeSchema,
  status: AssessmentStatusSchema,
  assessor: AssessorSchema,
  /** Audit period covered by this assessment. */
  periodStart: isoTimestampSchema,
  periodEnd: isoTimestampSchema,
  evidenceIds: z.array(z.string()),
  conclusion: AssessmentConclusionSchema.optional(),
  completedAt: isoTimestampSchema.optional(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});
export type Assessment = z.infer<typeof AssessmentSchema>;

export const CreateAssessmentSchema = AssessmentSchema.omit({
  id: true,
  status: true,
  conclusion: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateAssessment = z.infer<typeof CreateAssessmentSchema>;

export const CompleteAssessmentSchema = z.object({
  conclusion: AssessmentConclusionSchema,
  notes: z.string().optional(),
});
export type CompleteAssessment = z.infer<typeof CompleteAssessmentSchema>;

export const AssessmentSummarySchema = z.object({
  id: z.string().min(1),
  controlId: z.string().min(1),
  type: AssessmentTypeSchema,
  status: AssessmentStatusSchema,
  outcome: AssessmentOutcomeSchema.optional(),
  periodStart: isoTimestampSchema,
  periodEnd: isoTimestampSchema,
  completedAt: isoTimestampSchema.optional(),
});
export type AssessmentSummary = z.infer<typeof AssessmentSummarySchema>;

/** Determine whether a control passes based on its assessments. */
export function deriveControlEffectiveness(
  assessments: readonly Assessment[],
): AssessmentOutcome {
  const completed = assessments.filter((a) => a.status === "completed" && a.conclusion);
  if (completed.length === 0) return "not_tested";

  const outcomes = completed.map((a) => a.conclusion!.outcome);
  if (outcomes.every((o) => o === "effective")) return "effective";
  if (outcomes.some((o) => o === "ineffective")) return "ineffective";
  return "partially_effective";
}

/** Validate that an assessment has sufficient accepted evidence before completion. */
export function hasAdequateEvidence(
  assessment: Assessment,
  evidence: readonly Evidence[],
): boolean {
  const evidenceForAssessment = evidence.filter((e) =>
    assessment.evidenceIds.includes(e.id),
  );
  const accepted = filterAcceptedEvidence(evidenceForAssessment);
  return accepted.length > 0;
}

/** Build an assessment summary from a full assessment record. */
export function toAssessmentSummary(assessment: Assessment): AssessmentSummary {
  return {
    id: assessment.id,
    controlId: assessment.controlId,
    type: assessment.type,
    status: assessment.status,
    outcome: assessment.conclusion?.outcome,
    periodStart: assessment.periodStart,
    periodEnd: assessment.periodEnd,
    completedAt: assessment.completedAt,
  };
}

/** Compute the pass rate (0–1) for a set of assessments. */
export function computePassRate(assessments: readonly Assessment[]): number {
  const completed = assessments.filter(
    (a) => a.status === "completed" && a.conclusion,
  );
  if (completed.length === 0) return 0;
  const passed = completed.filter(
    (a) => a.conclusion!.outcome === "effective",
  ).length;
  return passed / completed.length;
}

/** Check whether all required controls have at least one completed assessment. */
export function assessmentCoverageCheck(
  controls: readonly Control[],
  assessments: readonly Assessment[],
): { covered: string[]; uncovered: string[] } {
  const assessedControlIds = new Set(
    assessments
      .filter((a) => a.status === "completed")
      .map((a) => a.controlId),
  );
  const covered: string[] = [];
  const uncovered: string[] = [];
  for (const c of controls) {
    if (assessedControlIds.has(c.id)) {
      covered.push(c.id);
    } else {
      uncovered.push(c.id);
    }
  }
  return { covered, uncovered };
}
