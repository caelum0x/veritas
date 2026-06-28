// Capacity feature service — orchestrates metric ingestion, utilization, forecasting, and recommendations via @veritas/capacity.
import { ok, err, newId, type Result } from "@veritas/core";
import {
  InMemoryMetricSource,
  samplesToUtilization,
  averageUtilization,
  peakUtilization,
  forecastUtilization,
  classifyUtilization,
  validateModel,
  DEFAULT_THRESHOLD,
  type MetricSource,
  type MetricSample,
  type UtilizationPoint,
  type SaturationResult,
  type ScalingRecommendation,
  type CapacityReport,
  type CapacityModel,
  type TimeWindow,
  type ForecastPoint,
} from "@veritas/capacity";
import type { Logger } from "@veritas/observability";
import type { ForecastQuery, PlanBody, SaturationQuery, CapacityReportBody } from "./capacity.schema.js";
import type { CapacityPlanResponse } from "./capacity.mapper.js";

export interface CapacityDeps {
  readonly metricSource: MetricSource;
  readonly logger: Logger;
}

interface SaturationAnalysis {
  readonly saturation: readonly SaturationResult[];
  readonly generatedAt: string;
}

interface ForecastAnalysis {
  readonly forecasts: readonly ForecastPoint[];
  readonly generatedAt: string;
}

interface RecommendationResult {
  readonly recommendations: readonly ScalingRecommendation[];
  readonly utilizationByResource: Readonly<Record<string, number>>;
  readonly generatedAt: string;
}

export class CapacityFeatureService {
  private readonly sampleBuffer: MetricSample[] = [];
  private readonly logger: Logger;

  constructor(deps: CapacityDeps) {
    this.logger = deps.logger;
  }

  ingestSamples(samples: readonly MetricSample[]): void {
    for (const s of samples) {
      this.sampleBuffer.push(s);
    }
    this.logger.debug("capacity_samples_ingested", { count: samples.length });
  }

  private buildSource(resourceNames?: readonly string[]): InMemoryMetricSource {
    const filtered = resourceNames && resourceNames.length > 0
      ? this.sampleBuffer.filter((s) => resourceNames.includes(s.resourceName))
      : [...this.sampleBuffer];
    return new InMemoryMetricSource(filtered);
  }

  async computePlan(body: PlanBody): Promise<Result<CapacityPlanResponse>> {
    if (!validateModel(body.model)) {
      return err(new Error("Invalid capacity model: elevated threshold must be less than critical and capacity > 0"));
    }

    const resourceNames = body.model.resources.map((r) => String(r.name));
    const source = this.buildSource(resourceNames);
    const rawSamples = await source.fetchSamples(resourceNames, body.windowMs);

    const utilResult = samplesToUtilization(rawSamples);
    if (!utilResult.ok) return err(utilResult.error);

    const points = utilResult.value;
    const avgUtil = averageUtilization(points);

    const forecastResult = forecastUtilization(points, body.forecastHorizonMs);
    const forecasts = forecastResult.ok ? forecastResult.value : [];

    const ratios = Object.values(avgUtil);
    const worst = ratios.length > 0 ? Math.max(...ratios) : 0;
    const threshold = body.model.resources[0]?.threshold ?? DEFAULT_THRESHOLD;
    const overallTier = classifyUtilization(worst, threshold);

    const nowMs = Date.now();
    return ok({
      planId: newId("plan"),
      modelId: body.model.id,
      generatedAt: new Date(nowMs).toISOString(),
      window: {
        startIso: new Date(nowMs - body.windowMs).toISOString(),
        endIso: new Date(nowMs).toISOString(),
        granularityMs: Math.floor(body.windowMs / 60),
      },
      utilizationByResource: avgUtil,
      forecasts: forecasts.map((f) => ({
        resourceName: f.resourceName,
        horizonMs: f.horizonMs,
        predictedRatio: f.predictedRatio,
        trend: f.trend,
        confidenceInterval: f.confidenceInterval,
      })),
      overallTier,
    });
  }

  async computeSaturation(query: SaturationQuery): Promise<Result<SaturationAnalysis>> {
    const resourceNames = query.resources
      ? query.resources.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const source = this.buildSource(resourceNames.length > 0 ? resourceNames : undefined);
    const names = resourceNames.length > 0
      ? resourceNames
      : [...new Set(this.sampleBuffer.map((s) => s.resourceName))];
    const rawSamples = await source.fetchSamples(names, 3_600_000);

    const utilResult = samplesToUtilization(rawSamples);
    if (!utilResult.ok) return err(utilResult.error);

    const points = utilResult.value;
    const nowIso = new Date().toISOString();
    const threshold = DEFAULT_THRESHOLD;

    const byResource = new Map<string, UtilizationPoint[]>();
    for (const p of points) {
      const existing = byResource.get(p.resourceName) ?? [];
      byResource.set(p.resourceName, [...existing, p]);
    }

    const saturation: SaturationResult[] = Array.from(byResource.entries()).map(([resourceName, pts]) => {
      const sorted = [...pts].sort((a, b) => a.timestampIso.localeCompare(b.timestampIso));
      const latest = sorted[sorted.length - 1];
      const ratio = latest?.ratio ?? 0;
      const tier = classifyUtilization(ratio, threshold);
      const status: "normal" | "warning" | "critical" =
        tier === "critical" ? "critical" : tier === "elevated" ? "warning" : "normal";
      const ratioValues = sorted.map((p) => p.ratio);
      const first = ratioValues[0] ?? 0;
      const last = ratioValues[ratioValues.length - 1] ?? 0;
      const delta = last - first;
      const trend: "increasing" | "stable" | "decreasing" =
        delta > 0.05 ? "increasing" : delta < -0.05 ? "decreasing" : "stable";
      return { resourceName, status, ratio, trend, detectedAt: nowIso };
    });

    return ok({ saturation, generatedAt: nowIso });
  }

  async computeForecast(query: ForecastQuery): Promise<Result<ForecastAnalysis>> {
    const resourceNames = query.resources
      ? query.resources.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const source = this.buildSource(resourceNames.length > 0 ? resourceNames : undefined);
    const names = resourceNames.length > 0
      ? resourceNames
      : [...new Set(this.sampleBuffer.map((s) => s.resourceName))];
    const rawSamples = await source.fetchSamples(names, 3_600_000);

    const utilResult = samplesToUtilization(rawSamples);
    if (!utilResult.ok) return err(utilResult.error);

    const forecastResult = forecastUtilization(utilResult.value, query.horizonMs);
    if (!forecastResult.ok) return err(forecastResult.error);

    return ok({ forecasts: forecastResult.value, generatedAt: new Date().toISOString() });
  }

  async computeRecommendations(query: { resources?: string; forecastHorizonMs: number }): Promise<Result<RecommendationResult>> {
    const resourceNames = query.resources
      ? query.resources.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const source = this.buildSource(resourceNames.length > 0 ? resourceNames : undefined);
    const names = resourceNames.length > 0
      ? resourceNames
      : [...new Set(this.sampleBuffer.map((s) => s.resourceName))];
    const rawSamples = await source.fetchSamples(names, 3_600_000);

    const utilResult = samplesToUtilization(rawSamples);
    if (!utilResult.ok) return err(utilResult.error);

    const points = utilResult.value;
    const avgUtil = averageUtilization(points);
    const peakUtil = peakUtilization(points);

    const forecastResult = forecastUtilization(points, query.forecastHorizonMs);
    const forecasts = forecastResult.ok ? forecastResult.value : [];

    const threshold = DEFAULT_THRESHOLD;
    const nowIso = new Date().toISOString();

    const recommendations: ScalingRecommendation[] = Object.entries(avgUtil).map(([resourceName, avgRatio]) => {
      const peakRatio = peakUtil[resourceName] ?? avgRatio;
      const forecast = forecasts.find((f) => f.resourceName === resourceName);
      const projectedRatio = forecast?.predictedRatio ?? avgRatio;

      let action: "scale-up" | "scale-down" | "no-op" = "no-op";
      let priority: "low" | "medium" | "high" | "critical" = "low";
      let reason = "Utilization is within normal bounds.";
      let suggestedCapacityDelta = 0;

      if (projectedRatio >= threshold.critical || peakRatio >= threshold.critical) {
        action = "scale-up";
        priority = "critical";
        reason = `Peak utilization ${(peakRatio * 100).toFixed(1)}% exceeds critical threshold. Immediate capacity increase required.`;
        suggestedCapacityDelta = Math.ceil((projectedRatio - threshold.elevated) * 100);
      } else if (projectedRatio >= threshold.elevated || avgRatio >= threshold.elevated) {
        action = "scale-up";
        priority = "high";
        reason = `Average utilization ${(avgRatio * 100).toFixed(1)}% approaching critical threshold. Proactive scaling recommended.`;
        suggestedCapacityDelta = Math.ceil((threshold.critical - avgRatio) * 50);
      } else if (avgRatio < 0.2 && peakRatio < 0.3) {
        action = "scale-down";
        priority = "medium";
        reason = `Average utilization ${(avgRatio * 100).toFixed(1)}% is very low. Consider reducing allocated capacity.`;
        suggestedCapacityDelta = -Math.ceil((0.3 - avgRatio) * 50);
      }

      return { resourceName, action, priority, reason, suggestedCapacityDelta, generatedAt: nowIso };
    });

    return ok({ recommendations, utilizationByResource: avgUtil, generatedAt: nowIso });
  }

  async buildCapacityReport(body: CapacityReportBody): Promise<Result<CapacityReport>> {
    if (!validateModel(body.model)) {
      return err(new Error("Invalid capacity model"));
    }

    const saturationResult = await this.computeSaturation({ resources: undefined });
    if (!saturationResult.ok) return err(saturationResult.error);

    const recResult = await this.computeRecommendations({
      forecastHorizonMs: body.forecastHorizonMs,
    });
    if (!recResult.ok) return err(recResult.error);

    const resource = body.model.resources[0];
    const worstRatio = resource
      ? recResult.value.utilizationByResource[String(resource.name)] ?? 0
      : 0;
    const overallTier = classifyUtilization(worstRatio, resource?.threshold ?? DEFAULT_THRESHOLD);

    const report: CapacityReport = {
      reportId: newId("cap-report"),
      generatedAt: new Date().toISOString(),
      window: body.window,
      saturation: saturationResult.value.saturation,
      recommendations: recResult.value.recommendations,
      summary: `Capacity report for model "${body.model.label}". Overall tier: ${overallTier}. ` +
        `${saturationResult.value.saturation.filter((s) => s.status === "critical").length} critical resources detected.`,
    };

    return ok(report);
  }
}
