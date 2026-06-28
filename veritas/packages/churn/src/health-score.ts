// Computes account health scores from activity signals and feature usage.
import { ok, err, Result, Clock, systemClock } from '@veritas/core';
import type { UserId } from '@veritas/core';
import type { AccountHealth, ChurnSignal } from './types.js';
import { HealthScoreNotFoundError } from './errors.js';
import type { ChurnStore } from './store.js';

const ACTIVITY_WEIGHT = 0.4;
const FEATURE_WEIGHT = 0.3;
const RECENCY_WEIGHT = 0.3;
const MAX_FEATURES = 10;
const RECENCY_DECAY_DAYS = 30;

function computeRecencyScore(lastActivityAt: string, nowMs: number): number {
  const lastMs = new Date(lastActivityAt).getTime();
  const diffDays = (nowMs - lastMs) / (1000 * 60 * 60 * 24);
  return Math.max(0, 1 - diffDays / RECENCY_DECAY_DAYS);
}

function extractActiveFeatures(signals: ReadonlyArray<ChurnSignal>): ReadonlyArray<string> {
  const featureSet = new Set<string>();
  for (const signal of signals) {
    if (signal.signalType.startsWith('feature_') && signal.value > 0) {
      featureSet.add(signal.signalType.replace('feature_', ''));
    }
  }
  return Array.from(featureSet);
}

function findLastActivity(signals: ReadonlyArray<ChurnSignal>): string {
  if (signals.length === 0) return new Date(0).toISOString();
  return signals.reduce((latest, s) =>
    s.recordedAt > latest ? s.recordedAt : latest,
    signals[0]!.recordedAt,
  );
}

function computeActivityScore(signals: ReadonlyArray<ChurnSignal>): number {
  if (signals.length === 0) return 0;
  const activitySignals = signals.filter((s) => s.signalType === 'session_count' || s.signalType === 'page_views');
  if (activitySignals.length === 0) return 0.5;
  const avg = activitySignals.reduce((sum, s) => sum + s.value, 0) / activitySignals.length;
  return Math.min(1, avg / 20);
}

export async function computeHealthScore(
  userId: UserId,
  store: ChurnStore,
  clock: Clock = systemClock,
): Promise<Result<AccountHealth>> {
  const signalsResult = await store.getSignals(userId);
  if (!signalsResult.ok) {
    if (signalsResult.error instanceof HealthScoreNotFoundError) return signalsResult as Result<AccountHealth>;
    // No signals yet — return baseline health
    const baseline: AccountHealth = {
      userId,
      healthScore: 50,
      lastActivityAt: new Date(0).toISOString(),
      activeFeatures: [],
      computedAt: clock.nowIso(),
    };
    return ok(baseline);
  }

  const signals = signalsResult.value;
  const nowMs = new Date(clock.now()).getTime();
  const lastActivityAt = findLastActivity(signals);
  const activeFeatures = extractActiveFeatures(signals);

  const activityScore = computeActivityScore(signals);
  const featureScore = Math.min(1, activeFeatures.length / MAX_FEATURES);
  const recencyScore = computeRecencyScore(lastActivityAt, nowMs);

  const rawScore =
    activityScore * ACTIVITY_WEIGHT +
    featureScore * FEATURE_WEIGHT +
    recencyScore * RECENCY_WEIGHT;

  const healthScore = Math.round(rawScore * 100);

  const health: AccountHealth = {
    userId,
    healthScore,
    lastActivityAt,
    activeFeatures,
    computedAt: clock.nowIso(),
  };

  await store.saveHealthScore(health);
  return ok(health);
}

export async function getHealthScore(
  userId: UserId,
  store: ChurnStore,
): Promise<Result<AccountHealth>> {
  return store.getHealthScore(userId);
}
