// Compliance report domain model: captures the state of compliance for a framework at a point in time.

import { z } from "zod";
import { type IsoTimestamp, isoTimestampSchema } from "@veritas/core";
import { FrameworkIdSchema, type FrameworkId } from "./framework.js";
import { ReportStatusSchema, type ReportStatus } from "./types.js";

export const ReportTypeSchema = z.enum([
  "gap_analysis",
  "readiness",
  "audit_ready",
  "continuous_monitoring",
  "executive_summary",
]);
export type ReportType = z.infer<typeof ReportTypeSchema>;

export const ControlResultSchema = z.object({
  controlId: z.string().min(1),
  controlCode: z.string().min(1),
  controlName: z.string().min(1),
  requirementIds: z.array(z.string()),
  assessmentOutcome: z.enum(["effective", "partially_effective", "ineffective", "not_tested"]),
  findingCount: z.number().int().nonnegative(),
  openFindingCount: z.number().int().nonnegative(),
  criticalFindingCount: z.number().int().nonnegative(),
  evidenceCount: z.number().int().nonnegative(),
  notes: z.string().optional(),
});
export type ControlResult = z.infer<typeof ControlResultSchema>;

export const RequirementResultSchema = z.object({
  requirementId: z.string().min(1),
  requirementCode: z.string().min(1),
  requirementTitle: z.string().min(1),
  controlResults: z.array(ControlResultSchema),
  overallStatus: z.enum(["compliant", "partially_compliant", "non_compliant", "not_assessed"]),
  riskLevel: z.enum(["critical", "high", "medium", "low", "none"]),
});
export type RequirementResult = z.infer<typeof RequirementResultSchema>;

export const ReportSummarySchema = z.object({
  totalControls: z.number().int().nonnegative(),
  assessedControls: z.number().int().nonnegative(),
  effectiveControls: z.number().int().nonnegative(),
  partiallyEffectiveControls: z.number().int().nonnegative(),
  ineffectiveControls: z.number().int().nonnegative(),
  notTestedControls: z.number().int().nonnegative(),
  totalFindings: z.number().int().nonnegative(),
  openFindings: z.number().int().nonnegative(),
  criticalFindings: z.number().int().nonnegative(),
  totalRequirements: z.number().int().nonnegative(),
  compliantRequirements: z.number().int().nonnegative(),
  partiallyCompliantRequirements: z.number().int().nonnegative(),
  nonCompliantRequirements: z.number().int().nonnegative(),
  overallCompliancePercent: z.number().min(0).max(100),
});
export type ReportSummary = z.infer<typeof ReportSummarySchema>;

export const ReportAuthorSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
});
export type ReportAuthor = z.infer<typeof ReportAuthorSchema>;

export const ComplianceReportSchema = z.object({
  id: z.string().min(1),
  frameworkId: FrameworkIdSchema,
  type: ReportTypeSchema,
  status: ReportStatusSchema,
  title: z.string().min(1),
  description: z.string().optional(),
  author: ReportAuthorSchema,
  /** ISO date range this report covers. */
  periodStart: isoTimestampSchema,
  periodEnd: isoTimestampSchema,
  organizationId: z.string().min(1),
  summary: ReportSummarySchema,
  requirementResults: z.array(RequirementResultSchema),
  recommendations: z.array(z.string()).default([]),
  executiveNarrative: z.string().optional(),
  approvedBy: ReportAuthorSchema.optional(),
  approvedAt: isoTimestampSchema.optional(),
  publishedAt: isoTimestampSchema.optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});
export type ComplianceReport = z.infer<typeof ComplianceReportSchema>;

export const CreateComplianceReportSchema = ComplianceReportSchema.omit({
  id: true,
  status: true,
  summary: true,
  requirementResults: true,
  approvedBy: true,
  approvedAt: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateComplianceReport = z.infer<typeof CreateComplianceReportSchema>;

/** Derive requirement compliance status from its control results. */
export function deriveRequirementStatus(
  controlResults: readonly ControlResult[],
): RequirementResult["overallStatus"] {
  if (controlResults.length === 0) return "not_assessed";
  const notTested = controlResults.every((c) => c.assessmentOutcome === "not_tested");
  if (notTested) return "not_assessed";
  const anyIneffective = controlResults.some(
    (c) => c.assessmentOutcome === "ineffective",
  );
  if (anyIneffective) return "non_compliant";
  const anyPartial = controlResults.some(
    (c) => c.assessmentOutcome === "partially_effective",
  );
  if (anyPartial) return "partially_compliant";
  return "compliant";
}

/** Compute aggregate report summary from requirement results. */
export function computeReportSummary(
  requirementResults: readonly RequirementResult[],
  totalRequirements: number,
): ReportSummary {
  const allControlResults = requirementResults.flatMap((r) => r.controlResults);
  const uniqueControlIds = new Set(allControlResults.map((c) => c.controlId));
  const totalControls = uniqueControlIds.size;

  let effectiveControls = 0;
  let partiallyEffectiveControls = 0;
  let ineffectiveControls = 0;
  let notTestedControls = 0;
  let totalFindings = 0;
  let openFindings = 0;
  let criticalFindings = 0;

  // Deduplicate control results by controlId to avoid double counting
  const seenControls = new Map<string, ControlResult>();
  for (const cr of allControlResults) {
    if (!seenControls.has(cr.controlId)) {
      seenControls.set(cr.controlId, cr);
    }
  }

  for (const cr of seenControls.values()) {
    switch (cr.assessmentOutcome) {
      case "effective":
        effectiveControls++;
        break;
      case "partially_effective":
        partiallyEffectiveControls++;
        break;
      case "ineffective":
        ineffectiveControls++;
        break;
      case "not_tested":
        notTestedControls++;
        break;
    }
    totalFindings += cr.findingCount;
    openFindings += cr.openFindingCount;
    criticalFindings += cr.criticalFindingCount;
  }

  const compliantRequirements = requirementResults.filter(
    (r) => r.overallStatus === "compliant",
  ).length;
  const partiallyCompliantRequirements = requirementResults.filter(
    (r) => r.overallStatus === "partially_compliant",
  ).length;
  const nonCompliantRequirements = requirementResults.filter(
    (r) => r.overallStatus === "non_compliant",
  ).length;

  const assessedRequirements = requirementResults.filter(
    (r) => r.overallStatus !== "not_assessed",
  ).length;
  const overallCompliancePercent =
    assessedRequirements > 0
      ? Math.round((compliantRequirements / assessedRequirements) * 10000) / 100
      : 0;

  return {
    totalControls,
    assessedControls: totalControls - notTestedControls,
    effectiveControls,
    partiallyEffectiveControls,
    ineffectiveControls,
    notTestedControls,
    totalFindings,
    openFindings,
    criticalFindings,
    totalRequirements,
    compliantRequirements,
    partiallyCompliantRequirements,
    nonCompliantRequirements,
    overallCompliancePercent,
  };
}

/** Return a framework-specific compliance level label based on the score. */
export function complianceLevelLabel(
  percent: number,
  frameworkId: FrameworkId,
): string {
  if (percent >= 95) return frameworkId.startsWith("soc2") ? "Audit Ready" : "Fully Compliant";
  if (percent >= 80) return "Substantially Compliant";
  if (percent >= 60) return "Partially Compliant";
  if (percent >= 30) return "Early Stage";
  return "Non-Compliant";
}
