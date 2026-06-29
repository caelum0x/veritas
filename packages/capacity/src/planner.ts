// Orchestrates load collection, forecasting, and headroom analysis into a capacity plan.
import { Result, ok, err, Clock, systemClock } from "@veritas/core";
import { CapacityModel, classifyUtilization } from "./capacity-model.js";
import { MetricSource, samplesToUtilization, averageUtilization } from "./load.js";
import { forecastUtilization, ForecastPoint } from "./forecast.js";
import { computeHeadroom, HeadroomResult } from "./headroom.js";
import { TimeWindow, UtilizationPoint } from "./types.js";
import { CapacityModelError, InsufficientDataError, ForecastError } from "./errors.js";

export interface CapacityPlan {
  readonly modelId: string;
  readonly planId: string;
  readonly generatedAt: string;
  readonly window: TimeWindow;
  readonly utilizationByResource: Record<string, number>;
  readonly headrooms: HeadroomResult[];
  readonly forecasts: ForecastPoint[];
  readonly overallTier: "low" | "nominal" | "elevated" | "critical";
}

export interface PlannerOptions {
  readonly windowMs: number;
  readonly forecastHorizonMs: number;
  readonly clock?: Clock;
}

const DEFAULT_OPTIONS: PlannerOptions = {
  windowMs: 60 * 60 * 1000,       // 1 hour look-back
  forecastHorizonMs: 30 * 60 * 1000, // 30 min horizon
};

export class CapacityPlanner {
  private readonly source: MetricSource;
  private readonly clock: Clock;

  constructor(source: MetricSource, clock: Clock = systemClock) {
    this.source = source;
    this.clock = clock;
  }

  async plan(
    model: CapacityModel,
    opts: Partial<PlannerOptions> = {}
  ): Promise<Result<CapacityPlan, CapacityModelError | InsufficientDataError | ForecastError>> {
    const options: PlannerOptions = { ...DEFAULT_OPTIONS, ...opts };
    const nowMs = this.clock.now();
    const nowIso = this.clock.nowIso();
    const startMs = nowMs - options.windowMs;

    const window: TimeWindow = {
      startIso: new Date(startMs).toISOString(),
      endIso: nowIso,
      granularityMs: Math.floor(options.windowMs / 60),
    };

    const resourceNames = model.resources.map((r) => r.name as string);
    const rawSamples = await this.source.fetchSamples(resourceNames, options.windowMs);

    const utilResult = samplesToUtilization(rawSamples);
    if (!utilResult.ok) return err(utilResult.error as InsufficientDataError);

    const points: UtilizationPoint[] = utilResult.value;
    const avgUtil = averageUtilization(points);

    const headroomResult = computeHeadroom(model.resources, points);
    if (!headroomResult.ok) return err(headroomResult.error as InsufficientDataError);

    const forecastResult = forecastUtilization(points, options.forecastHorizonMs);
    if (!forecastResult.ok) {
      // Non-fatal: proceed without forecasts if insufficient data
      const isFatal = !(forecastResult.error instanceof InsufficientDataError);
      if (isFatal) return err(forecastResult.error as ForecastError);
    }

    const forecasts = forecastResult.ok ? forecastResult.value : [];

    // Derive overall tier from worst average utilization
    const ratios = Object.values(avgUtil);
    const worst = ratios.length > 0 ? Math.max(...ratios) : 0;
    // Use the first resource's threshold as a proxy (or defaults)
    const threshold = model.resources[0]?.threshold ?? { elevated: 0.70, critical: 0.90 };
    const overallTier = classifyUtilization(worst, threshold);

    const plan: CapacityPlan = {
      modelId: model.id,
      planId: `plan-${Date.now()}`,
      generatedAt: nowIso,
      window,
      utilizationByResource: avgUtil,
      headrooms: headroomResult.value,
      forecasts,
      overallTier,
    };

    return ok(plan);
  }
}
