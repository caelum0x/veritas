// Scaling recommendation engine: maps saturation results to actionable scaling advice.
import { Result, ok } from "@veritas/core";
import { SaturationResult, ScalingRecommendation, ScalingAction } from "./types.js";

const STATUS_ACTION_MAP: Record<SaturationResult["status"], ScalingAction> = {
  critical: "scale-up",
  warning: "scale-up",
  normal: "no-op",
};

type Priority = ScalingRecommendation["priority"];

function derivePriority(saturation: SaturationResult): Priority {
  if (saturation.status === "critical") return "critical";
  if (saturation.status === "warning" && saturation.trend === "increasing") return "high";
  if (saturation.status === "warning") return "medium";
  if (saturation.trend === "increasing" && saturation.ratio > 0.5) return "low";
  return "low";
}

function deriveReason(saturation: SaturationResult): string {
  const pct = (saturation.ratio * 100).toFixed(1);
  if (saturation.status === "critical") {
    return `${saturation.resourceName} is at critical utilisation (${pct}%); immediate scale-up required.`;
  }
  if (saturation.status === "warning" && saturation.trend === "increasing") {
    return `${saturation.resourceName} utilisation (${pct}%) is elevated and trending upward; proactive scale-up recommended.`;
  }
  if (saturation.status === "warning") {
    return `${saturation.resourceName} utilisation (${pct}%) is elevated; consider adding capacity.`;
  }
  return `${saturation.resourceName} utilisation (${pct}%) is within normal bounds; no action needed.`;
}

/** Conservative delta: 20% headroom above current usage, rounded up to nearest 10%. */
function deriveCapacityDelta(saturation: SaturationResult): number {
  if (saturation.status === "normal") return 0;
  const targetRatio = 0.60; // aim for 60% utilisation post-scale
  const delta = Math.max(0, saturation.ratio - targetRatio);
  return Math.ceil(delta * 10) / 10; // fraction of total capacity to add
}

export interface RecommendationInput {
  readonly saturation: readonly SaturationResult[];
  readonly nowIso?: string;
}

/** Produce a scaling recommendation for each saturated resource. */
export function buildRecommendations(
  input: RecommendationInput,
): Result<readonly ScalingRecommendation[], never> {
  const { saturation, nowIso = new Date().toISOString() } = input;

  const recommendations: ScalingRecommendation[] = saturation.map((s) => ({
    resourceName: s.resourceName,
    action: STATUS_ACTION_MAP[s.status],
    priority: derivePriority(s),
    reason: deriveReason(s),
    suggestedCapacityDelta: deriveCapacityDelta(s),
    generatedAt: nowIso,
  }));

  return ok(recommendations);
}
