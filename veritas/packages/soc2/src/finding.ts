// Audit finding: deficiency or exception identified during control assessment.

import { z } from "zod";
import { isoTimestampSchema } from "@veritas/core";
import { type AssessmentOutcome } from "./assessment.js";

export const FindingSeveritySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
  "informational",
]);
export type FindingSeverity = z.infer<typeof FindingSeveritySchema>;

export const FindingStatusSchema = z.enum([
  "open",
  "in_remediation",
  "remediated",
  "accepted_risk",
  "closed",
  "wont_fix",
]);
export type FindingStatus = z.infer<typeof FindingStatusSchema>;

export const FindingTypeSchema = z.enum([
  "control_deficiency",
  "significant_deficiency",
  "material_weakness",
  "observation",
  "exception",
]);
export type FindingType = z.infer<typeof FindingTypeSchema>;

export const RemediationPlanSchema = z.object({
  description: z.string().min(1),
  owner: z.string().min(1),
  targetDate: isoTimestampSchema,
  steps: z.array(z.string()).min(1),
});
export type RemediationPlan = z.infer<typeof RemediationPlanSchema>;

export const FindingSchema = z.object({
  id: z.string().min(1),
  assessmentId: z.string().min(1),
  controlId: z.string().min(1),
  type: FindingTypeSchema,
  severity: FindingSeveritySchema,
  status: FindingStatusSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  impact: z.string().min(1),
  rootCause: z.string().optional(),
  recommendation: z.string().min(1),
  remediationPlan: RemediationPlanSchema.optional(),
  remediatedAt: isoTimestampSchema.optional(),
  remediationNotes: z.string().optional(),
  /** Criteria references from the SOC2 catalog impacted by this finding. */
  criteriaRefs: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});
export type Finding = z.infer<typeof FindingSchema>;

export const CreateFindingSchema = FindingSchema.omit({
  id: true,
  status: true,
  remediatedAt: true,
  remediationNotes: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateFinding = z.infer<typeof CreateFindingSchema>;

export const UpdateFindingSchema = z.object({
  status: FindingStatusSchema.optional(),
  remediationPlan: RemediationPlanSchema.optional(),
  remediationNotes: z.string().optional(),
  rootCause: z.string().optional(),
});
export type UpdateFinding = z.infer<typeof UpdateFindingSchema>;

export const FindingSummarySchema = z.object({
  id: z.string().min(1),
  controlId: z.string().min(1),
  type: FindingTypeSchema,
  severity: FindingSeveritySchema,
  status: FindingStatusSchema,
  title: z.string().min(1),
  createdAt: isoTimestampSchema,
});
export type FindingSummary = z.infer<typeof FindingSummarySchema>;

/** Map assessment outcome to the appropriate finding type. */
export function outcomeToFindingType(outcome: AssessmentOutcome): FindingType | null {
  switch (outcome) {
    case "ineffective":
      return "material_weakness";
    case "partially_effective":
      return "significant_deficiency";
    case "effective":
    case "not_tested":
      return null;
  }
}

/** Determine the overall risk severity from a collection of findings. */
export function aggregateFindingSeverity(
  findings: readonly Finding[],
): FindingSeverity | null {
  const open = findings.filter(
    (f) => f.status === "open" || f.status === "in_remediation",
  );
  if (open.length === 0) return null;

  const order: FindingSeverity[] = ["critical", "high", "medium", "low", "informational"];
  for (const level of order) {
    if (open.some((f) => f.severity === level)) return level;
  }
  return "informational";
}

/** Build a lightweight summary from a full finding. */
export function toFindingSummary(finding: Finding): FindingSummary {
  return {
    id: finding.id,
    controlId: finding.controlId,
    type: finding.type,
    severity: finding.severity,
    status: finding.status,
    title: finding.title,
    createdAt: finding.createdAt,
  };
}

/** Return findings grouped by severity for reporting. */
export function groupFindingsBySeverity(
  findings: readonly Finding[],
): Readonly<Record<FindingSeverity, Finding[]>> {
  const groups: Record<FindingSeverity, Finding[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
    informational: [],
  };
  for (const finding of findings) {
    groups[finding.severity].push(finding);
  }
  return groups;
}

/** Count open findings that require remediation. */
export function countOpenFindings(findings: readonly Finding[]): number {
  return findings.filter(
    (f) => f.status === "open" || f.status === "in_remediation",
  ).length;
}
