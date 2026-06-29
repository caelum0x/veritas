// QualityReport: aggregated outcome of running all gates in the pipeline.

import type { GateResult, GateFinding } from "./result.js";
import type { Severity } from "./severity.js";
import { maxSeverity, SEVERITY_RANK } from "./severity.js";

/** Aggregated quality report produced by the gate pipeline. */
export interface QualityReport {
  /** True only when every gate passed. */
  readonly passed: boolean;
  /** The highest severity finding across all gates, or null when no findings exist. */
  readonly worstSeverity: Severity | null;
  /** Individual gate outcomes in execution order. */
  readonly gates: readonly GateResult[];
  /** Flat list of all findings across every gate, sorted descending by severity. */
  readonly findings: readonly GateFinding[];
  /** ISO-8601 timestamp when the report was created. */
  readonly createdAt: string;
  /** Total number of gates evaluated. */
  readonly gateCount: number;
  /** Number of gates that failed. */
  readonly failedCount: number;
}

/** Build a QualityReport from an ordered list of gate results. */
export function buildQualityReport(
  gates: readonly GateResult[],
  asOf: string,
): QualityReport {
  const allFindings: GateFinding[] = [];
  let worst: Severity | null = null;
  let failedCount = 0;

  for (const gate of gates) {
    if (!gate.passed) failedCount++;
    for (const finding of gate.findings) {
      allFindings.push(finding);
      worst = worst === null ? finding.severity : maxSeverity(worst, finding.severity);
    }
  }

  const sortedFindings = [...allFindings].sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity],
  );

  return {
    passed: failedCount === 0,
    worstSeverity: worst,
    gates,
    findings: sortedFindings,
    createdAt: asOf,
    gateCount: gates.length,
    failedCount,
  };
}
