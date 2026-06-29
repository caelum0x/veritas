// Compliance status: aggregates control assessments into a point-in-time SOC2 posture summary.

import { z } from "zod";
import { type IsoTimestamp, isoTimestampSchema } from "@veritas/core";
import { type TrustServiceCategory } from "./control.js";

export const ControlComplianceStateSchema = z.enum([
  "compliant",
  "non_compliant",
  "partially_compliant",
  "not_assessed",
  "not_applicable",
]);
export type ControlComplianceState = z.infer<
  typeof ControlComplianceStateSchema
>;

export const ControlStatusSummarySchema = z.object({
  controlId: z.string().min(1),
  controlCode: z.string().min(1),
  controlName: z.string().min(1),
  category: z.custom<TrustServiceCategory>(),
  state: ControlComplianceStateSchema,
  lastAssessedAt: isoTimestampSchema.nullable(),
  openFindingsCount: z.number().int().nonnegative(),
  evidenceCount: z.number().int().nonnegative(),
});
export type ControlStatusSummary = z.infer<typeof ControlStatusSummarySchema>;

export const CategoryPostureSchema = z.object({
  category: z.custom<TrustServiceCategory>(),
  totalControls: z.number().int().nonnegative(),
  compliant: z.number().int().nonnegative(),
  nonCompliant: z.number().int().nonnegative(),
  partiallyCompliant: z.number().int().nonnegative(),
  notAssessed: z.number().int().nonnegative(),
  notApplicable: z.number().int().nonnegative(),
  compliancePercent: z.number().min(0).max(100),
});
export type CategoryPosture = z.infer<typeof CategoryPostureSchema>;

export const ComplianceStatusSchema = z.object({
  snapshotId: z.string().min(1),
  organizationId: z.string().min(1),
  asOf: isoTimestampSchema,
  overallState: ControlComplianceStateSchema,
  overallCompliancePercent: z.number().min(0).max(100),
  categoryPostures: z.array(CategoryPostureSchema),
  controlSummaries: z.array(ControlStatusSummarySchema),
  totalOpenFindings: z.number().int().nonnegative(),
  criticalOpenFindings: z.number().int().nonnegative(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type ComplianceStatus = z.infer<typeof ComplianceStatusSchema>;

/** Compute the posture for a single trust-service category. */
export function computeCategoryPosture(
  category: TrustServiceCategory,
  summaries: readonly ControlStatusSummary[],
): CategoryPosture {
  const relevant = summaries.filter((s) => s.category === category);
  const counts = {
    compliant: 0,
    nonCompliant: 0,
    partiallyCompliant: 0,
    notAssessed: 0,
    notApplicable: 0,
  };
  for (const s of relevant) {
    switch (s.state) {
      case "compliant":
        counts.compliant++;
        break;
      case "non_compliant":
        counts.nonCompliant++;
        break;
      case "partially_compliant":
        counts.partiallyCompliant++;
        break;
      case "not_assessed":
        counts.notAssessed++;
        break;
      case "not_applicable":
        counts.notApplicable++;
        break;
    }
  }
  const assessable =
    relevant.length - counts.notApplicable - counts.notAssessed;
  const compliancePercent =
    assessable > 0
      ? Math.round((counts.compliant / assessable) * 10000) / 100
      : 0;

  return {
    category,
    totalControls: relevant.length,
    compliant: counts.compliant,
    nonCompliant: counts.nonCompliant,
    partiallyCompliant: counts.partiallyCompliant,
    notAssessed: counts.notAssessed,
    notApplicable: counts.notApplicable,
    compliancePercent,
  };
}

/** Derive an overall compliance state from per-category postures. */
export function deriveOverallState(
  postures: readonly CategoryPosture[],
): ControlComplianceState {
  if (postures.length === 0) return "not_assessed";
  const hasNonCompliant = postures.some((p) => p.nonCompliant > 0);
  if (hasNonCompliant) return "non_compliant";
  const hasPartial = postures.some((p) => p.partiallyCompliant > 0);
  if (hasPartial) return "partially_compliant";
  const hasNotAssessed = postures.some((p) => p.notAssessed > 0);
  if (hasNotAssessed) return "partially_compliant";
  return "compliant";
}

/** Compute overall compliance percent as a weighted average across categories. */
export function computeOverallPercent(
  postures: readonly CategoryPosture[],
): number {
  const assessable = postures.filter((p) => p.totalControls > 0);
  if (assessable.length === 0) return 0;
  const total = assessable.reduce((acc, p) => acc + p.compliancePercent, 0);
  return Math.round((total / assessable.length) * 100) / 100;
}

/** Build a full ComplianceStatus snapshot from control summaries. */
export function buildComplianceStatus(
  snapshotId: string,
  organizationId: string,
  asOf: IsoTimestamp,
  summaries: readonly ControlStatusSummary[],
  criticalOpenFindings: number,
): ComplianceStatus {
  const ALL_CATEGORIES: readonly TrustServiceCategory[] = [
    "security",
    "availability",
    "processing_integrity",
    "confidentiality",
    "privacy",
  ];
  const categoryPostures = ALL_CATEGORIES.map((cat) =>
    computeCategoryPosture(cat, summaries),
  );
  const overallState = deriveOverallState(categoryPostures);
  const overallCompliancePercent = computeOverallPercent(categoryPostures);
  const totalOpenFindings = summaries.reduce(
    (acc, s) => acc + s.openFindingsCount,
    0,
  );

  return {
    snapshotId,
    organizationId,
    asOf,
    overallState,
    overallCompliancePercent,
    categoryPostures,
    controlSummaries: [...summaries],
    totalOpenFindings,
    criticalOpenFindings,
  };
}
