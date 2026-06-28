// Capacity report builder: assembles saturation and recommendation data into a structured report.
import { Result, ok, err, newId } from "@veritas/core";
import { TimeWindow, SaturationResult, ScalingRecommendation, CapacityReport } from "./types.js";
import { CapacityModelError } from "./errors.js";

export interface ReportInput {
  readonly window: TimeWindow;
  readonly saturation: readonly SaturationResult[];
  readonly recommendations: readonly ScalingRecommendation[];
  readonly nowIso?: string;
}

function buildSummary(
  saturation: readonly SaturationResult[],
  recommendations: readonly ScalingRecommendation[],
): string {
  const critical = saturation.filter((s) => s.status === "critical").length;
  const warning = saturation.filter((s) => s.status === "warning").length;
  const scaleUps = recommendations.filter((r) => r.action === "scale-up").length;

  if (critical === 0 && warning === 0) {
    return "All resources are operating within normal bounds. No scaling action is required.";
  }

  const parts: string[] = [];
  if (critical > 0) parts.push(`${critical} resource(s) at critical saturation`);
  if (warning > 0) parts.push(`${warning} resource(s) at elevated saturation`);
  if (scaleUps > 0) parts.push(`${scaleUps} scale-up recommendation(s) issued`);

  return parts.join("; ") + ".";
}

/** Compose a CapacityReport from pre-computed saturation and recommendation data. */
export function buildReport(input: ReportInput): Result<CapacityReport, CapacityModelError> {
  const { window, saturation, recommendations, nowIso = new Date().toISOString() } = input;

  if (window.startIso >= window.endIso) {
    return err(new CapacityModelError("Report window start must be before end"));
  }

  const report: CapacityReport = {
    reportId: newId("report"),
    generatedAt: nowIso,
    window,
    saturation: [...saturation],
    recommendations: [...recommendations],
    summary: buildSummary(saturation, recommendations),
  };

  return ok(report);
}
