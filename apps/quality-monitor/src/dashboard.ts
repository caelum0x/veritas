// Quality dashboard data assembly — composes gate trends and alert summaries for UI consumers.

import { ok, err, type Result } from "@veritas/core";
import type { AppError } from "@veritas/core";
import type { GateTrend } from "./trends.js";
import type { QualityAlert } from "./alerts.js";
import type { GateSnapshot } from "./collector.js";

export interface GateSummary {
  readonly gateId: string;
  readonly latestPassRate: number;
  readonly drift: number;
  readonly totalSnapshots: number;
  readonly lastCapturedAt: string | undefined;
}

export interface QualityDashboardData {
  readonly generatedAt: string;
  readonly overallPassRate: number;
  readonly gateCount: number;
  readonly gates: readonly GateSummary[];
  readonly activeAlerts: readonly QualityAlert[];
  readonly alertCount: number;
  readonly trendingDown: readonly string[];
  readonly trendingUp: readonly string[];
}

export interface QualityDashboardDeps {
  readonly getTrends: () => Result<readonly GateTrend[], AppError>;
  readonly getAlerts: () => readonly QualityAlert[];
  readonly getAllSnapshots: () => ReadonlyMap<string, readonly GateSnapshot[]>;
}

function summariseGate(
  trend: GateTrend,
  snapshots: readonly GateSnapshot[],
): GateSummary {
  const lastSnap = snapshots.length > 0 ? snapshots[snapshots.length - 1] : undefined;
  return {
    gateId: trend.gateId,
    latestPassRate: trend.latestPassRate,
    drift: trend.drift,
    totalSnapshots: snapshots.length,
    lastCapturedAt: lastSnap?.capturedAt,
  };
}

export function buildQualityDashboard(
  deps: QualityDashboardDeps,
): Result<QualityDashboardData, AppError> {
  const trendsResult = deps.getTrends();
  if (!trendsResult.ok) return err(trendsResult.error);

  const trends = trendsResult.value;
  const allSnapshots = deps.getAllSnapshots();
  const activeAlerts = deps.getAlerts();

  const gates = trends.map((t) =>
    summariseGate(t, allSnapshots.get(t.gateId) ?? []),
  );

  const overallPassRate =
    gates.length > 0
      ? gates.reduce((sum, g) => sum + g.latestPassRate, 0) / gates.length
      : 0;

  const trendingDown = trends
    .filter((t) => t.drift < 0)
    .map((t) => t.gateId);

  const trendingUp = trends
    .filter((t) => t.drift > 0)
    .map((t) => t.gateId);

  return ok({
    generatedAt: new Date().toISOString(),
    overallPassRate,
    gateCount: gates.length,
    gates,
    activeAlerts,
    alertCount: activeAlerts.length,
    trendingDown,
    trendingUp,
  });
}
