// Track quality metrics over time by orchestrating collector, trends, and alerts.

import { ok, isErr, type Result } from "@veritas/core";
import type { PipelineOutcome } from "@veritas/quality-gates";
import type { Collector } from "./collector.js";
import type { GateTrend } from "./trends.js";
import { computeAllTrends } from "./trends.js";
import type { AlertStore, QualityAlert } from "./alerts.js";
import type { MonitorConfig } from "./config.js";

export interface MonitorSnapshot {
  readonly trends: readonly GateTrend[];
  readonly newAlerts: readonly QualityAlert[];
  readonly allAlerts: readonly QualityAlert[];
  readonly snapshotAt: string;
}

export interface QualityMonitor {
  /** Ingest a pipeline outcome and update internal metrics. */
  ingest(outcome: PipelineOutcome, asOf?: string): Result<MonitorSnapshot>;
  /** Return the latest computed trends without ingesting new data. */
  trends(): Result<readonly GateTrend[]>;
  /** Return all retained alerts. */
  alerts(): readonly QualityAlert[];
  /** Reset all collected state. */
  reset(): void;
}

export function createQualityMonitor(
  collector: Collector,
  alertStore: AlertStore,
  config: MonitorConfig,
): QualityMonitor {
  return {
    ingest(outcome, asOf) {
      const now = asOf ?? new Date().toISOString();

      const collectR = collector.collect(outcome, now);
      if (isErr(collectR)) return collectR;

      const trendsR = computeAllTrends(collector.allSnapshots(), 5);
      if (isErr(trendsR)) return trendsR;

      const alertsR = alertStore.evaluate(trendsR.value, {
        regressionThreshold: config.regressionThreshold,
        alertFailOn: config.alertFailOn,
        asOf: now,
      });
      if (isErr(alertsR)) return alertsR;

      return ok({
        trends: trendsR.value,
        newAlerts: alertsR.value,
        allAlerts: alertStore.all(),
        snapshotAt: now,
      });
    },

    trends() {
      return computeAllTrends(collector.allSnapshots(), 5);
    },

    alerts() {
      return alertStore.all();
    },

    reset() {
      collector.reset();
      alertStore.clear();
    },
  };
}
