// Report generator: assembles ComplianceReport from controls, assessments, findings, and mappings.

import { type IsoTimestamp, newId } from "@veritas/core";
import {
  type ComplianceReport,
  type ReportAuthor,
  type ReportType,
  type ControlResult,
  type RequirementResult,
  deriveRequirementStatus,
  computeReportSummary,
  complianceLevelLabel,
} from "./report.js";
import {
  type FrameworkId,
  getFramework,
} from "./framework.js";
import {
  type ControlRequirementMapping,
  getMappingsForFramework,
  groupMappingsByRequirement,
} from "./mapping.js";
import {
  type GapAnalysisResult,
} from "./gap-analysis.js";

export interface ControlInputRecord {
  readonly controlId: string;
  readonly controlCode: string;
  readonly controlName: string;
  readonly assessmentOutcome: ControlResult["assessmentOutcome"];
  readonly findingCount: number;
  readonly openFindingCount: number;
  readonly criticalFindingCount: number;
  readonly evidenceCount: number;
  readonly notes?: string;
}

export interface GenerateReportInput {
  readonly frameworkId: FrameworkId;
  readonly organizationId: string;
  readonly type: ReportType;
  readonly title: string;
  readonly description?: string;
  readonly author: ReportAuthor;
  readonly periodStart: IsoTimestamp;
  readonly periodEnd: IsoTimestamp;
  readonly controls: readonly ControlInputRecord[];
  readonly mappings: readonly ControlRequirementMapping[];
  readonly gapAnalysis?: GapAnalysisResult;
  readonly tags?: readonly string[];
  readonly metadata?: Record<string, unknown>;
}

/** Derive a risk level label for a requirement result. */
function deriveRiskLevel(
  controlResults: readonly ControlResult[],
): RequirementResult["riskLevel"] {
  const anyIneffective = controlResults.some((c) => c.assessmentOutcome === "ineffective");
  const anyCritical = controlResults.some((c) => c.criticalFindingCount > 0);
  const anyOpen = controlResults.some((c) => c.openFindingCount > 0);
  const anyPartial = controlResults.some((c) => c.assessmentOutcome === "partially_effective");

  if (anyIneffective && anyCritical) return "critical";
  if (anyIneffective) return "high";
  if (anyCritical) return "high";
  if (anyPartial && anyOpen) return "medium";
  if (anyOpen) return "medium";
  if (anyPartial) return "low";
  return "none";
}

/** Build control result objects indexed by controlId. */
function buildControlResultMap(
  controls: readonly ControlInputRecord[],
): Map<string, ControlResult> {
  return new Map(
    controls.map((c) => [
      c.controlId,
      {
        controlId: c.controlId,
        controlCode: c.controlCode,
        controlName: c.controlName,
        requirementIds: [],
        assessmentOutcome: c.assessmentOutcome,
        findingCount: c.findingCount,
        openFindingCount: c.openFindingCount,
        criticalFindingCount: c.criticalFindingCount,
        evidenceCount: c.evidenceCount,
        notes: c.notes,
      },
    ]),
  );
}

/** Assemble requirement results from framework requirements and control mappings. */
function buildRequirementResults(
  input: GenerateReportInput,
  controlResultMap: Map<string, ControlResult>,
): RequirementResult[] {
  const framework = getFramework(input.frameworkId);
  const frameworkMappings = getMappingsForFramework(input.mappings, input.frameworkId);
  const mappingsByRequirement = groupMappingsByRequirement(frameworkMappings);

  return framework.requirements.map((requirement) => {
    const requirementMappings = mappingsByRequirement.get(requirement.id) ?? [];
    const controlIds = requirementMappings.map((m) => m.controlId);

    const controlResults: ControlResult[] = [];
    for (const controlId of controlIds) {
      const cr = controlResultMap.get(controlId);
      if (cr != null) {
        // Attach this requirement to the control result (immutable append)
        const updatedCr: ControlResult = {
          ...cr,
          requirementIds: cr.requirementIds.includes(requirement.id)
            ? cr.requirementIds
            : [...cr.requirementIds, requirement.id],
        };
        controlResults.push(updatedCr);
        // Update the map so other requirements see the accumulated requirementIds
        controlResultMap.set(controlId, updatedCr);
      }
    }

    const overallStatus = deriveRequirementStatus(controlResults);
    const riskLevel = deriveRiskLevel(controlResults);

    return {
      requirementId: requirement.id,
      requirementCode: requirement.code,
      requirementTitle: requirement.title,
      controlResults,
      overallStatus,
      riskLevel,
    };
  });
}

/** Build an executive narrative for the report. */
function buildExecutiveNarrative(
  report: Omit<ComplianceReport, "id" | "createdAt" | "updatedAt">,
  frameworkName: string,
): string {
  const { summary } = report;
  const levelLabel = complianceLevelLabel(summary.overallCompliancePercent, report.frameworkId);
  const lines: string[] = [
    `This ${frameworkName} compliance report covers the period from ${report.periodStart} to ${report.periodEnd}.`,
    `Overall compliance status: ${levelLabel} (${summary.overallCompliancePercent}%).`,
    `${summary.effectiveControls} of ${summary.totalControls} controls are operating effectively.`,
  ];
  if (summary.criticalFindings > 0) {
    lines.push(
      `There are ${summary.criticalFindings} critical finding(s) that require immediate attention.`,
    );
  }
  if (summary.openFindings > 0) {
    lines.push(`${summary.openFindings} findings remain open and require remediation.`);
  }
  if (summary.criticalFindings === 0 && summary.openFindings === 0) {
    lines.push("No open or critical findings were identified in this period.");
  }
  return lines.join(" ");
}

/** Generate a compliance report from the provided input data. */
export function generateComplianceReport(input: GenerateReportInput): ComplianceReport {
  const framework = getFramework(input.frameworkId);
  const controlResultMap = buildControlResultMap(input.controls);
  const requirementResults = buildRequirementResults(input, controlResultMap);
  const summary = computeReportSummary(requirementResults, framework.requirements.length);

  const now = new Date().toISOString() as IsoTimestamp;
  const id = newId("crpt");

  const partial = {
    id,
    frameworkId: input.frameworkId,
    type: input.type,
    status: "draft" as const,
    title: input.title,
    description: input.description,
    author: input.author,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    organizationId: input.organizationId,
    summary,
    requirementResults,
    recommendations: buildRecommendations(requirementResults),
    tags: [...(input.tags ?? [])],
    metadata: input.metadata,
    createdAt: now,
    updatedAt: now,
  };

  const executiveNarrative = buildExecutiveNarrative(partial, framework.name);

  return {
    ...partial,
    executiveNarrative,
  };
}

/** Build top-level recommendations from the worst requirement results. */
function buildRecommendations(
  requirementResults: readonly RequirementResult[],
): string[] {
  const nonCompliant = requirementResults.filter(
    (r) => r.overallStatus === "non_compliant",
  );
  const partial = requirementResults.filter(
    (r) => r.overallStatus === "partially_compliant",
  );

  const recommendations: string[] = [];

  for (const r of nonCompliant.slice(0, 5)) {
    recommendations.push(
      `Remediate non-compliant requirement ${r.requirementCode}: ${r.requirementTitle}.`,
    );
  }
  for (const r of partial.slice(0, 3)) {
    recommendations.push(
      `Improve partial compliance for requirement ${r.requirementCode}: ${r.requirementTitle}.`,
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "Maintain current control effectiveness and continue evidence collection.",
    );
  }

  return recommendations;
}

/** Transition a report from draft to in_review status. */
export function submitReportForReview(
  report: ComplianceReport,
): ComplianceReport {
  if (report.status !== "draft") {
    throw new Error(`Cannot submit report in status "${report.status}" for review.`);
  }
  const now = new Date().toISOString() as IsoTimestamp;
  return { ...report, status: "in_review", updatedAt: now };
}

/** Approve and publish a report. */
export function approveReport(
  report: ComplianceReport,
  approver: ReportAuthor,
): ComplianceReport {
  if (report.status !== "in_review") {
    throw new Error(`Cannot approve report in status "${report.status}".`);
  }
  const now = new Date().toISOString() as IsoTimestamp;
  return {
    ...report,
    status: "published",
    approvedBy: approver,
    approvedAt: now,
    publishedAt: now,
    updatedAt: now,
  };
}
