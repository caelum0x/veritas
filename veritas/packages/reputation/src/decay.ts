// Time-based exponential decay of reputation scores toward a neutral baseline.

import { clampScore, asScore, Score } from "@veritas/core";

/** Decay configuration controlling half-life and neutral baseline. */
export interface DecayConfig {
  /** Half-life in milliseconds: time for distance-to-neutral to halve. */
  readonly halfLifeMs: number;
  /** Neutral score that all scores decay toward (0–1). */
  readonly neutral: Score;
}

export const DEFAULT_DECAY_CONFIG: DecayConfig = {
  halfLifeMs: 30 * 24 * 60 * 60 * 1000, // 30 days
  neutral: asScore(0.5),
};

/**
 * Apply exponential decay to a score given elapsed time.
 * score(t) = neutral + (score(0) - neutral) * 2^(-t / halfLife)
 */
export function applyDecay(
  score: Score,
  elapsedMs: number,
  config: DecayConfig = DEFAULT_DECAY_CONFIG,
): Score {
  if (elapsedMs <= 0) return score;
  const decay = Math.pow(2, -elapsedMs / config.halfLifeMs);
  const decayed = config.neutral + (score - config.neutral) * decay;
  return clampScore(decayed);
}

/**
 * Compute the effective weight for a past event based on its age.
 * Returns a multiplier in (0, 1] that older events receive.
 */
export function eventAgeWeight(
  elapsedMs: number,
  halfLifeMs: number = DEFAULT_DECAY_CONFIG.halfLifeMs,
): number {
  if (elapsedMs <= 0) return 1;
  return Math.pow(2, -elapsedMs / halfLifeMs);
}

/**
 * Compute the number of milliseconds until a score crosses a threshold,
 * given it is currently decaying from `score` toward `neutral`.
 * Returns null if the threshold is already crossed or unreachable.
 */
export function timeToThreshold(
  score: Score,
  threshold: Score,
  config: DecayConfig = DEFAULT_DECAY_CONFIG,
): number | null {
  const { halfLifeMs, neutral } = config;
  const distNow = score - neutral;
  const distTarget = threshold - neutral;
  if (distNow === 0) return null;
  // Same sign check: threshold must be between score and neutral
  if (Math.sign(distNow) !== Math.sign(distTarget)) return null;
  if (Math.abs(distTarget) >= Math.abs(distNow)) return null;
  // t = -halfLife * log2(distTarget / distNow)
  const t = -halfLifeMs * Math.log2(distTarget / distNow);
  return t > 0 ? t : null;
}
