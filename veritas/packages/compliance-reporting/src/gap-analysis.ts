// Gap analysis: identifies compliance gaps between current control state and framework requirements.

import { z } from "zod";
import { type IsoTimestamp, isoTimestampSchema } from "@veritas/core";
import { FrameworkIdSchema, type FrameworkId, type Requirement, getFramework, getMandatoryRequirements } from "./framework.js";
import { type ControlRequirementMapping, getMappingsForFramework, getControlsForRequirement } from "./mapping.js";
import { GapSeveritySchema, type GapSeverity } from "./types.js";

export const GapTypeSchema = z.enum([
  "no_control_mapping",
  "control_ineffective",
  "control_not_tested",
  "insufficient_evidence",
  "partial_coverage",
  "open_findings",
]);
export type GapType = z.infer<typeof GapTypeSchema>;

export const RemediationPrioritySchema = z.enum(["immediate", "short_term", "medium_term", "long_term"]);
export type RemediationPriority = z.infer<typeof RemediationPrioritySchema>;

export const GapSchema = z.object({
  id: z.string().min(1),
  frameworkId: FrameworkIdSchema,
  requirementId: z.string().min(1),
  requirementCode: z.string().min(1),
  requirementTitle: z.string().min(1),
  gapType: GapTypeSchema,
  severity: GapSeveritySchema,
  description: z.string().min(1),
  affectedControlIds: z.array(z.string()),
  remediationPriority: RemediationPrioritySchema,
  suggestedActions: z.array(z.string()).min(1),
  estimatedEffort: z.enum(["low", "medium", "high"]).optional(),
  notes: z.string().optional(),
});
export type Gap = z.infer<typeof GapSchema>;

export const GapAnalysisResultSchema = z.object({
  id: z.string().min(1),
  frameworkId: FrameworkIdSchema,
  organizationId: z.string().min(1),
  analyzedAt: isoTimestampSchema,
  periodStart: isoTimestampSchema,
  periodEnd: isoTimestampSchema,
  gaps: z.array(GapSchema),
  totalGaps: z.number().int().nonnegative(),
  criticalGaps: z.number().int().nonnegative(),
  highGaps: z.number().int().nonnegative(),
  mediumGaps: z.number().int().nonnegative(),
  lowGaps: z.number().int().nonnegative(),
  requirementsCovered: z.number().int().nonnegative(),
  requirementsTotal: z.number().int().nonnegative(),
  mandatoryRequirementsMet: z.number().int().nonnegative(),
  mandatoryRequirementsTotal: z.number().int().nonnegative(),
  overallReadinessPercent: z.number().min(0).max(100),
  executiveSummary: z.string().min(1),
});
export type GapAnalysisResult = z.infer<typeof GapAnalysisResultSchema>;

export interface ControlEffectivenessInput {
  readonly controlId: string;
  readonly outcome: "effective" | "partially_effective" | "ineffective" | "not_tested";
  readonly openFindingCount: number;
  readonly evidenceCount: number;
}

export interface GapAnalysisInput {
  readonly frameworkId: FrameworkId;
  readonly organizationId: string;
  readonly periodStart: IsoTimestamp;
  readonly periodEnd: IsoTimestamp;
  readonly mappings: readonly ControlRequirementMapping[];
  readonly controlEffectiveness: readonly ControlEffectivenessInput[];
}

/** Map gap type and requirement mandatory flag to severity. */
function deriveSeverity(
  gapType: GapType,
  requirement: Requirement,
): GapSeverity {
  if (gapType === "no_control_mapping" && requirement.mandatory) return "critical";
  if (gapType === "control_ineffective" && requirement.mandatory) return "high";
  if (gapType === "no_control_mapping" && !requirement.mandatory) return "high";
  if (gapType === "control_ineffective") return "medium";
  if (gapType === "open_findings") return "medium";
  if (gapType === "insufficient_evidence") return "medium";
  if (gapType === "control_not_tested" && requirement.mandatory) return "medium";
  return "low";
}

/** Derive remediation priority from severity. */
function derivePriority(severity: GapSeverity): RemediationPriority {
  switch (severity) {
    case "critical": return "immediate";
    case "high": return "short_term";
    case "medium": return "medium_term";
    case "low": return "long_term";
  }
}

/** Build suggested remediation actions for a gap type. */
function suggestedActionsFor(
  gapType: GapType,
  requirementTitle: string,
): string[] {
  switch (gapType) {
    case "no_control_mapping":
      return [
        `Design and implement a control that addresses "${requirementTitle}".`,
        "Document the control in the control catalog.",
        "Assign a control owner and testing procedure.",
      ];
    case "control_ineffective":
      return [
        "Review root cause of control ineffectiveness.",
        "Update control design or operating procedures.",
        "Re-test the control after remediation.",
      ];
    case "control_not_tested":
      return [
        "Schedule a control assessment within the audit period.",
        "Collect sufficient evidence to support testing.",
        "Document testing results and conclusions.",
      ];
    case "insufficient_evidence":
      return [
        "Identify and collect additional evidence artifacts.",
        "Ensure evidence covers the full audit period.",
        "Automate evidence collection where possible.",
      ];
    case "partial_coverage":
      return [
        `Add additional controls to fully address "${requirementTitle}".`,
        "Review existing control mappings for completeness.",
        "Document rationale for partial coverage if acceptable.",
      ];
    case "open_findings":
      return [
        "Prioritize remediation of open findings for this requirement.",
        "Assign owners and target dates for each finding.",
        "Verify remediation before next assessment period.",
      ];
  }
}

let _gapCounter = 0;
function nextGapId(): string {
  _gapCounter++;
  return `gap-${Date.now()}-${_gapCounter}`;
}

/** Run gap analysis for a framework given current control state and mappings. */
export function runGapAnalysis(
  input: GapAnalysisInput,
): GapAnalysisResult {
  const framework = getFramework(input.frameworkId);
  const frameworkMappings = getMappingsForFramework(input.mappings, input.frameworkId);
  const controlMap = new Map<string, ControlEffectivenessInput>(
    input.controlEffectiveness.map((c) => [c.controlId, c]),
  );

  const gaps: Gap[] = [];

  for (const requirement of framework.requirements) {
    const mappedControlIds = getControlsForRequirement(
      frameworkMappings,
      requirement.id,
    );

    // Gap: no control mapped at all
    if (mappedControlIds.length === 0) {
      gaps.push({
        id: nextGapId(),
        frameworkId: input.frameworkId,
        requirementId: requirement.id,
        requirementCode: requirement.code,
        requirementTitle: requirement.title,
        gapType: "no_control_mapping",
        severity: deriveSeverity("no_control_mapping", requirement),
        description: `No controls are mapped to requirement "${requirement.code}: ${requirement.title}".`,
        affectedControlIds: [],
        remediationPriority: derivePriority(deriveSeverity("no_control_mapping", requirement)),
        suggestedActions: suggestedActionsFor("no_control_mapping", requirement.title),
        estimatedEffort: "high",
      });
      continue;
    }

    // Analyse controls that are mapped
    const ineffectiveControlIds: string[] = [];
    const notTestedControlIds: string[] = [];
    const openFindingControlIds: string[] = [];
    const noEvidenceControlIds: string[] = [];
    let anyEffective = false;

    for (const controlId of mappedControlIds) {
      const ctl = controlMap.get(controlId);
      if (ctl == null) {
        notTestedControlIds.push(controlId);
        continue;
      }
      if (ctl.outcome === "effective") {
        anyEffective = true;
      } else if (ctl.outcome === "ineffective") {
        ineffectiveControlIds.push(controlId);
      } else if (ctl.outcome === "not_tested") {
        notTestedControlIds.push(controlId);
      }
      if (ctl.openFindingCount > 0) {
        openFindingControlIds.push(controlId);
      }
      if (ctl.evidenceCount === 0 && ctl.outcome !== "not_tested") {
        noEvidenceControlIds.push(controlId);
      }
    }

    if (ineffectiveControlIds.length > 0) {
      const sev = deriveSeverity("control_ineffective", requirement);
      gaps.push({
        id: nextGapId(),
        frameworkId: input.frameworkId,
        requirementId: requirement.id,
        requirementCode: requirement.code,
        requirementTitle: requirement.title,
        gapType: "control_ineffective",
        severity: sev,
        description: `${ineffectiveControlIds.length} control(s) mapped to "${requirement.code}" were assessed as ineffective.`,
        affectedControlIds: ineffectiveControlIds,
        remediationPriority: derivePriority(sev),
        suggestedActions: suggestedActionsFor("control_ineffective", requirement.title),
        estimatedEffort: "medium",
      });
    }

    if (notTestedControlIds.length > 0 && !anyEffective) {
      const sev = deriveSeverity("control_not_tested", requirement);
      gaps.push({
        id: nextGapId(),
        frameworkId: input.frameworkId,
        requirementId: requirement.id,
        requirementCode: requirement.code,
        requirementTitle: requirement.title,
        gapType: "control_not_tested",
        severity: sev,
        description: `${notTestedControlIds.length} control(s) mapped to "${requirement.code}" have not been tested.`,
        affectedControlIds: notTestedControlIds,
        remediationPriority: derivePriority(sev),
        suggestedActions: suggestedActionsFor("control_not_tested", requirement.title),
        estimatedEffort: "medium",
      });
    }

    if (noEvidenceControlIds.length > 0) {
      const sev = deriveSeverity("insufficient_evidence", requirement);
      gaps.push({
        id: nextGapId(),
        frameworkId: input.frameworkId,
        requirementId: requirement.id,
        requirementCode: requirement.code,
        requirementTitle: requirement.title,
        gapType: "insufficient_evidence",
        severity: sev,
        description: `${noEvidenceControlIds.length} control(s) lack evidence artifacts for "${requirement.code}".`,
        affectedControlIds: noEvidenceControlIds,
        remediationPriority: derivePriority(sev),
        suggestedActions: suggestedActionsFor("insufficient_evidence", requirement.title),
        estimatedEffort: "low",
      });
    }

    if (openFindingControlIds.length > 0) {
      const sev = deriveSeverity("open_findings", requirement);
      gaps.push({
        id: nextGapId(),
        frameworkId: input.frameworkId,
        requirementId: requirement.id,
        requirementCode: requirement.code,
        requirementTitle: requirement.title,
        gapType: "open_findings",
        severity: sev,
        description: `Open findings exist against controls mapped to "${requirement.code}".`,
        affectedControlIds: openFindingControlIds,
        remediationPriority: derivePriority(sev),
        suggestedActions: suggestedActionsFor("open_findings", requirement.title),
        estimatedEffort: "medium",
      });
    }
  }

  // Compute summary statistics
  const mandatoryRequirements = getMandatoryRequirements(framework);
  const totalRequirements = framework.requirements.length;
  const gapRequirementIds = new Set(gaps.map((g) => g.requirementId));
  const requirementsCovered = totalRequirements - gapRequirementIds.size;
  const mandatoryGapIds = new Set(
    gaps
      .filter((g) =>
        mandatoryRequirements.some((r) => r.id === g.requirementId),
      )
      .map((g) => g.requirementId),
  );
  const mandatoryRequirementsMet = mandatoryRequirements.length - mandatoryGapIds.size;

  const criticalGaps = gaps.filter((g) => g.severity === "critical").length;
  const highGaps = gaps.filter((g) => g.severity === "high").length;
  const mediumGaps = gaps.filter((g) => g.severity === "medium").length;
  const lowGaps = gaps.filter((g) => g.severity === "low").length;

  const overallReadinessPercent =
    totalRequirements > 0
      ? Math.round((requirementsCovered / totalRequirements) * 10000) / 100
      : 100;

  const executiveSummary = buildExecutiveSummary(
    input.frameworkId,
    framework.name,
    overallReadinessPercent,
    criticalGaps,
    highGaps,
    mandatoryRequirementsMet,
    mandatoryRequirements.length,
  );

  const analyzedAt = new Date().toISOString() as IsoTimestamp;

  return {
    id: `gap-analysis-${Date.now()}`,
    frameworkId: input.frameworkId,
    organizationId: input.organizationId,
    analyzedAt,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    gaps,
    totalGaps: gaps.length,
    criticalGaps,
    highGaps,
    mediumGaps,
    lowGaps,
    requirementsCovered,
    requirementsTotal: totalRequirements,
    mandatoryRequirementsMet,
    mandatoryRequirementsTotal: mandatoryRequirements.length,
    overallReadinessPercent,
    executiveSummary,
  };
}

function buildExecutiveSummary(
  frameworkId: FrameworkId,
  frameworkName: string,
  readinessPercent: number,
  criticalGaps: number,
  highGaps: number,
  mandatoryMet: number,
  mandatoryTotal: number,
): string {
  const parts: string[] = [
    `${frameworkName} gap analysis completed with ${readinessPercent}% requirement coverage.`,
  ];
  if (criticalGaps > 0) {
    parts.push(`${criticalGaps} critical gap(s) require immediate remediation.`);
  }
  if (highGaps > 0) {
    parts.push(`${highGaps} high-severity gap(s) should be addressed in the short term.`);
  }
  parts.push(
    `${mandatoryMet} of ${mandatoryTotal} mandatory requirements are currently met.`,
  );
  if (readinessPercent >= 90) {
    parts.push("The organisation is in a strong position for certification.");
  } else if (readinessPercent >= 70) {
    parts.push("Targeted remediation efforts will advance certification readiness.");
  } else {
    parts.push("A structured remediation programme is recommended before pursuing certification.");
  }
  return parts.join(" ");
}

/** Filter gaps by severity. */
export function filterGapsBySeverity(
  result: GapAnalysisResult,
  severity: GapSeverity,
): Gap[] {
  return result.gaps.filter((g) => g.severity === severity);
}

/** Return gaps grouped by requirement ID. */
export function groupGapsByRequirement(
  gaps: readonly Gap[],
): Map<string, Gap[]> {
  const map = new Map<string, Gap[]>();
  for (const gap of gaps) {
    const existing = map.get(gap.requirementId) ?? [];
    map.set(gap.requirementId, [...existing, gap]);
  }
  return map;
}
