// MTTR and MTTA metrics computation for incident management.
import type { Incident } from "./types.js";

export interface IncidentMetrics {
  /** Mean Time To Acknowledge (ms) */
  mtta: number | null;
  /** Mean Time To Resolve (ms) */
  mttr: number | null;
  /** Mean Time To Mitigate (ms) */
  mttm: number | null;
  totalIncidents: number;
  resolvedCount: number;
  acknowledgedCount: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
}

function diffMs(a: string, b: string): number {
  return new Date(b).getTime() - new Date(a).getTime();
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

export function computeMetrics(incidents: readonly Incident[]): IncidentMetrics {
  const ttaValues: number[] = [];
  const ttrValues: number[] = [];
  const ttmValues: number[] = [];

  const byStatus: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};

  let resolvedCount = 0;
  let acknowledgedCount = 0;

  for (const inc of incidents) {
    byStatus[inc.status] = (byStatus[inc.status] ?? 0) + 1;
    bySeverity[inc.severity] = (bySeverity[inc.severity] ?? 0) + 1;

    if (inc.acknowledgedAt) {
      acknowledgedCount++;
      ttaValues.push(diffMs(inc.detectedAt, inc.acknowledgedAt));
    }

    if (inc.resolvedAt) {
      resolvedCount++;
      ttrValues.push(diffMs(inc.detectedAt, inc.resolvedAt));
    }

    if (inc.mitigatedAt) {
      ttmValues.push(diffMs(inc.detectedAt, inc.mitigatedAt));
    }
  }

  return {
    mtta: average(ttaValues),
    mttr: average(ttrValues),
    mttm: average(ttmValues),
    totalIncidents: incidents.length,
    resolvedCount,
    acknowledgedCount,
    byStatus,
    bySeverity,
  };
}

export interface SloMetrics {
  targetMttrMs: number;
  actualMttrMs: number | null;
  withinSlo: boolean | null;
  sloBreachCount: number;
  sloBreachRate: number | null;
}

export function computeSloMetrics(
  incidents: readonly Incident[],
  targetMttrMs: number,
): SloMetrics {
  const resolved = incidents.filter((i) => i.resolvedAt);
  const breaches = resolved.filter((i) => {
    const ttr = diffMs(i.detectedAt, i.resolvedAt!);
    return ttr > targetMttrMs;
  });

  const ttrs = resolved.map((i) => diffMs(i.detectedAt, i.resolvedAt!));
  const actualMttrMs = ttrs.length > 0
    ? ttrs.reduce((a, b) => a + b, 0) / ttrs.length
    : null;

  const sloBreachRate = resolved.length > 0
    ? breaches.length / resolved.length
    : null;

  return {
    targetMttrMs,
    actualMttrMs,
    withinSlo: actualMttrMs !== null ? actualMttrMs <= targetMttrMs : null,
    sloBreachCount: breaches.length,
    sloBreachRate,
  };
}
