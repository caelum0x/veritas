// Saturation detection: classifies resource utilisation into status levels and detects trends.
import { Result, ok, err } from "@veritas/core";
import { CapacityTier, classifyUtilization, Threshold, DEFAULT_THRESHOLD } from "./capacity-model.js";
import { UtilizationPoint, TrendDirection, SaturationResult, SaturationStatus } from "./types.js";
import { SaturationError } from "./errors.js";

/** Map CapacityTier to SaturationStatus. */
function tierToStatus(tier: CapacityTier): SaturationStatus {
  if (tier === "critical") return "critical";
  if (tier === "elevated") return "warning";
  return "normal";
}

/** Estimate trend direction from an ordered (oldest-first) series of ratios. */
export function detectTrend(ratios: readonly number[]): TrendDirection {
  if (ratios.length < 2) return "stable";
  const first = ratios[0] ?? 0;
  const last = ratios[ratios.length - 1] ?? 0;
  const delta = last - first;
  if (delta > 0.05) return "increasing";
  if (delta < -0.05) return "decreasing";
  return "stable";
}

export interface SaturationInput {
  readonly points: readonly UtilizationPoint[];
  readonly threshold?: Threshold;
  readonly nowIso?: string;
}

/**
 * Analyse utilisation points per resource and return saturation results.
 * Points must be non-empty; each must carry a non-negative ratio.
 */
export function detectSaturation(input: SaturationInput): Result<readonly SaturationResult[], SaturationError> {
  const { points, threshold = DEFAULT_THRESHOLD, nowIso = new Date().toISOString() } = input;

  if (points.length === 0) {
    return err(new SaturationError("No utilisation points provided for saturation detection"));
  }

  // Group points by resourceName.
  const byResource = new Map<string, UtilizationPoint[]>();
  for (const p of points) {
    const existing = byResource.get(p.resourceName) ?? [];
    byResource.set(p.resourceName, [...existing, p]);
  }

  const results: SaturationResult[] = [];

  for (const [resourceName, resourcePoints] of byResource) {
    // Sort oldest-first for trend detection.
    const sorted = [...resourcePoints].sort((a, b) => a.timestampIso.localeCompare(b.timestampIso));
    const latestPoint = sorted[sorted.length - 1];
    if (latestPoint === undefined) continue;

    const ratio = latestPoint.ratio;
    const tier = classifyUtilization(ratio, threshold);
    const status = tierToStatus(tier);
    const trend = detectTrend(sorted.map((p) => p.ratio));

    results.push({
      resourceName,
      status,
      ratio,
      trend,
      detectedAt: nowIso,
    });
  }

  return ok(results);
}
