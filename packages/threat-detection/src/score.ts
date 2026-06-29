// Utility for computing aggregated risk scores from individual signal weights.

import type { RiskLevel, RiskScore } from "./types.js";

function toLevel(value: number): RiskLevel {
  if (value >= 80) return "critical";
  if (value >= 60) return "high";
  if (value >= 30) return "medium";
  return "low";
}

export function computeRiskScore(
  signals: ReadonlyArray<{ readonly label: string; readonly weight: number }>
): RiskScore {
  const clamped = signals.map((s) => ({
    label: s.label,
    weight: Math.min(100, Math.max(0, s.weight)),
  }));

  const total = clamped.reduce((acc, s) => acc + s.weight, 0);
  const value = Math.min(100, total);
  const level = toLevel(value);
  const activeSignals = clamped
    .filter((s) => s.weight > 0)
    .map((s) => s.label);

  return Object.freeze({ value, level, signals: activeSignals });
}

export function mergeScores(scores: readonly RiskScore[]): RiskScore {
  if (scores.length === 0) {
    return Object.freeze({ value: 0, level: "low" as RiskLevel, signals: [] });
  }
  const maxValue = Math.max(...scores.map((s) => s.value));
  const allSignals = [...new Set(scores.flatMap((s) => [...s.signals]))];
  return Object.freeze({ value: maxValue, level: toLevel(maxValue), signals: allSignals });
}

export function scoreFromWeightedMax(
  signals: ReadonlyArray<{ readonly label: string; readonly weight: number }>
): RiskScore {
  if (signals.length === 0) {
    return Object.freeze({ value: 0, level: "low" as RiskLevel, signals: [] });
  }
  const sorted = [...signals].sort((a, b) => b.weight - a.weight);
  // Weighted max: top signal contributes fully, each subsequent halved to avoid over-saturation.
  let value = 0;
  let factor = 1;
  for (const s of sorted) {
    value += Math.min(100, Math.max(0, s.weight)) * factor;
    factor *= 0.5;
  }
  const clamped = Math.min(100, value);
  return Object.freeze({
    value: clamped,
    level: toLevel(clamped),
    signals: signals.filter((s) => s.weight > 0).map((s) => s.label),
  });
}
