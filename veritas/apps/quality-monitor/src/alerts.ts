// Alert on quality regressions detected in gate trends.

import { ok, newId, type Result } from "@veritas/core";
import type { Severity } from "@veritas/quality-gates";
import type { GateTrend } from "./trends.js";

export interface QualityAlert {
  readonly id: string;
  readonly gateId: string;
  readonly severity: Severity;
  readonly message: string;
  readonly drift: number;
  readonly latestPassRate: number;
  readonly detectedAt: string;
}

export interface AlertStore {
  evaluate(trends: readonly GateTrend[], options: AlertOptions): Result<readonly QualityAlert[]>;
  all(): readonly QualityAlert[];
  clear(): void;
}

export interface AlertOptions {
  readonly regressionThreshold: number;
  readonly alertFailOn: Severity;
  readonly asOf?: string;
}

const SEVERITY_RANK: Record<Severity, number> = {
  info: 0,
  warning: 1,
  error: 2,
  critical: 3,
};

function pickSeverity(drift: number, failOn: Severity): Severity {
  const magnitude = Math.abs(drift);
  if (magnitude >= 0.3) return "critical";
  if (magnitude >= 0.15) return "error";
  if (magnitude >= 0.05) return "warning";
  return "info";
}

function meetsThreshold(severity: Severity, failOn: Severity): boolean {
  return SEVERITY_RANK[severity] >= SEVERITY_RANK[failOn];
}

export function createAlertStore(maxAlerts: number = 500): AlertStore {
  const stored: QualityAlert[] = [];

  return {
    evaluate(trends, options) {
      const now = options.asOf ?? new Date().toISOString();
      const created: QualityAlert[] = [];

      for (const trend of trends) {
        if (trend.points.length < 2) continue;
        if (trend.drift >= -options.regressionThreshold) continue;

        const severity = pickSeverity(trend.drift, options.alertFailOn);
        if (!meetsThreshold(severity, options.alertFailOn)) continue;

        const alert: QualityAlert = {
          id: newId("alert"),
          gateId: trend.gateId,
          severity,
          message: `Gate "${trend.gateId}" pass-rate dropped by ${(Math.abs(trend.drift) * 100).toFixed(1)}% (now ${(trend.latestPassRate * 100).toFixed(1)}%).`,
          drift: trend.drift,
          latestPassRate: trend.latestPassRate,
          detectedAt: now,
        };

        created.push(alert);

        const next = [...stored, alert];
        if (next.length > maxAlerts) {
          stored.splice(0, next.length - maxAlerts);
        }
        stored.push(alert);
      }

      return ok(created);
    },

    all() {
      return [...stored];
    },

    clear() {
      stored.splice(0, stored.length);
    },
  };
}
