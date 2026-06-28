// Maps @veritas/capacity domain objects to immutable HTTP response shapes.
import type { ForecastPoint } from "@veritas/capacity";
import type { UtilizationPoint, SaturationResult, ScalingRecommendation, CapacityReport } from "@veritas/capacity";

export interface UtilizationPointResponse {
  readonly timestampIso: string;
  readonly resourceName: string;
  readonly ratio: number;
}

export interface SaturationResultResponse {
  readonly resourceName: string;
  readonly status: string;
  readonly ratio: number;
  readonly trend: string;
  readonly detectedAt: string;
}

export interface ForecastPointResponse {
  readonly resourceName: string;
  readonly horizonMs: number;
  readonly predictedRatio: number;
  readonly trend: string;
  readonly confidenceInterval: readonly [number, number];
}

export interface ScalingRecommendationResponse {
  readonly resourceName: string;
  readonly action: string;
  readonly priority: string;
  readonly reason: string;
  readonly suggestedCapacityDelta: number;
  readonly generatedAt: string;
}

export interface CapacityPlanResponse {
  readonly planId: string;
  readonly modelId: string;
  readonly generatedAt: string;
  readonly window: { readonly startIso: string; readonly endIso: string; readonly granularityMs: number };
  readonly utilizationByResource: Readonly<Record<string, number>>;
  readonly forecasts: readonly ForecastPointResponse[];
  readonly overallTier: string;
}

export interface CapacityReportResponse {
  readonly reportId: string;
  readonly generatedAt: string;
  readonly window: { readonly startIso: string; readonly endIso: string; readonly granularityMs: number };
  readonly saturation: readonly SaturationResultResponse[];
  readonly recommendations: readonly ScalingRecommendationResponse[];
  readonly summary: string;
}

export function toUtilizationPointResponse(p: UtilizationPoint): UtilizationPointResponse {
  return Object.freeze({ timestampIso: p.timestampIso, resourceName: p.resourceName, ratio: p.ratio });
}

export function toSaturationResultResponse(r: SaturationResult): SaturationResultResponse {
  return Object.freeze({
    resourceName: r.resourceName,
    status: r.status,
    ratio: r.ratio,
    trend: r.trend,
    detectedAt: r.detectedAt,
  });
}

export function toForecastPointResponse(f: ForecastPoint): ForecastPointResponse {
  return Object.freeze({
    resourceName: f.resourceName,
    horizonMs: f.horizonMs,
    predictedRatio: f.predictedRatio,
    trend: f.trend,
    confidenceInterval: Object.freeze([f.confidenceInterval[0], f.confidenceInterval[1]] as [number, number]),
  });
}

export function toScalingRecommendationResponse(r: ScalingRecommendation): ScalingRecommendationResponse {
  return Object.freeze({
    resourceName: r.resourceName,
    action: r.action,
    priority: r.priority,
    reason: r.reason,
    suggestedCapacityDelta: r.suggestedCapacityDelta,
    generatedAt: r.generatedAt,
  });
}

export function toCapacityReportResponse(report: CapacityReport): CapacityReportResponse {
  return Object.freeze({
    reportId: report.reportId,
    generatedAt: report.generatedAt,
    window: Object.freeze({
      startIso: report.window.startIso,
      endIso: report.window.endIso,
      granularityMs: report.window.granularityMs,
    }),
    saturation: Object.freeze(report.saturation.map(toSaturationResultResponse)),
    recommendations: Object.freeze(report.recommendations.map(toScalingRecommendationResponse)),
    summary: report.summary,
  });
}
