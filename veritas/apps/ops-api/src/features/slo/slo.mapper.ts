// Maps @veritas/slo domain objects to HTTP response shapes for the SLO feature.
import type { Slo } from "@veritas/slo";
import type { SloEvaluationResult } from "@veritas/slo";
import type { BurnAlertEvent } from "@veritas/slo";
import type { SloReport } from "@veritas/slo";

export interface SloResponse {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly sliName: string;
  readonly targetRatio: number;
  readonly windowDurationMs: number;
  readonly windowKind: string;
  readonly tags?: Readonly<Record<string, string>>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SloEvaluationResponse {
  readonly id: string;
  readonly sloId: string;
  readonly sliName: string;
  readonly windowStartMs: number;
  readonly windowEndMs: number;
  readonly goodCount: number;
  readonly totalCount: number;
  readonly observedRatio: number;
  readonly targetRatio: number;
  readonly compliant: boolean;
  readonly errorBudgetConsumedRatio: number;
  readonly evaluatedAt: string;
}

export interface BurnAlertResponse {
  readonly id: string;
  readonly sloId: string;
  readonly severity: string;
  readonly longWindowBurnRate: number;
  readonly shortWindowBurnRate: number;
  readonly longWindowThreshold: number;
  readonly shortWindowThreshold: number;
  readonly errorBudgetConsumedRatio: number;
  readonly firedAt: string;
}

export interface SloReportResponse {
  readonly id: string;
  readonly sloId: string;
  readonly sliName: string;
  readonly windowStartMs: number;
  readonly windowEndMs: number;
  readonly totalEvaluations: number;
  readonly compliantEvaluations: number;
  readonly complianceRate: number;
  readonly targetRatio: number;
  readonly avgObservedRatio: number;
  readonly minObservedRatio: number;
  readonly maxObservedRatio: number;
  readonly avgErrorBudgetConsumedRatio: number;
  readonly maxErrorBudgetConsumedRatio: number;
  readonly alertsFired: readonly string[];
  readonly generatedAt: string;
}

export function toSloResponse(slo: Slo): SloResponse {
  return Object.freeze({
    id: slo.id,
    name: slo.name,
    description: slo.description,
    sliName: slo.sliName,
    targetRatio: slo.targetRatio,
    windowDurationMs: slo.windowDurationMs,
    windowKind: slo.windowKind,
    tags: slo.tags !== undefined ? Object.freeze({ ...slo.tags }) : undefined,
    createdAt: slo.createdAt,
    updatedAt: slo.updatedAt,
  });
}

export function toSloEvaluationResponse(r: SloEvaluationResult): SloEvaluationResponse {
  return Object.freeze({
    id: r.id,
    sloId: r.sloId,
    sliName: r.sliName,
    windowStartMs: r.windowStartMs,
    windowEndMs: r.windowEndMs,
    goodCount: r.goodCount,
    totalCount: r.totalCount,
    observedRatio: r.observedRatio,
    targetRatio: r.targetRatio,
    compliant: r.compliant,
    errorBudgetConsumedRatio: r.errorBudgetConsumedRatio,
    evaluatedAt: r.evaluatedAt,
  });
}

export function toBurnAlertResponse(e: BurnAlertEvent): BurnAlertResponse {
  return Object.freeze({
    id: e.id,
    sloId: e.sloId,
    severity: e.severity,
    longWindowBurnRate: e.longWindowBurnRate,
    shortWindowBurnRate: e.shortWindowBurnRate,
    longWindowThreshold: e.longWindowThreshold,
    shortWindowThreshold: e.shortWindowThreshold,
    errorBudgetConsumedRatio: e.errorBudgetConsumedRatio,
    firedAt: e.firedAt,
  });
}

export function toSloReportResponse(r: SloReport): SloReportResponse {
  return Object.freeze({
    id: r.id,
    sloId: r.sloId,
    sliName: r.sliName,
    windowStartMs: r.windowStartMs,
    windowEndMs: r.windowEndMs,
    totalEvaluations: r.totalEvaluations,
    compliantEvaluations: r.compliantEvaluations,
    complianceRate: r.complianceRate,
    targetRatio: r.targetRatio,
    avgObservedRatio: r.avgObservedRatio,
    minObservedRatio: r.minObservedRatio,
    maxObservedRatio: r.maxObservedRatio,
    avgErrorBudgetConsumedRatio: r.avgErrorBudgetConsumedRatio,
    maxErrorBudgetConsumedRatio: r.maxErrorBudgetConsumedRatio,
    alertsFired: Object.freeze([...r.alertsFired]),
    generatedAt: r.generatedAt,
  });
}
