// Score history: immutable log of PTS snapshots over time for trend analysis.

import { type IsoTimestamp, epochToIso, newId } from "@veritas/core";
import type { PtsScore } from "./pts-score.js";

/** A single point in the reputation score history. */
export interface ScoreHistoryEntry {
  readonly id: string;
  readonly agentId: string;
  readonly score: PtsScore;
  readonly eventCount: number;
  readonly recordedAt: IsoTimestamp;
  readonly reason: string | undefined;
}

/** Port for score history persistence. */
export interface ScoreHistoryStore {
  append(entry: ScoreHistoryEntry): Promise<void>;
  listByAgent(
    agentId: string,
    options?: HistoryQueryOptions,
  ): Promise<ReadonlyArray<ScoreHistoryEntry>>;
}

export interface HistoryQueryOptions {
  readonly since?: IsoTimestamp;
  readonly until?: IsoTimestamp;
  readonly limit?: number;
}

/** Build a new history entry (does not persist). */
export function makeHistoryEntry(
  agentId: string,
  score: PtsScore,
  eventCount: number,
  reason?: string,
): ScoreHistoryEntry {
  return {
    id: newId("hist"),
    agentId,
    score,
    eventCount,
    recordedAt: epochToIso(Date.now()),
    reason,
  };
}

/** Compute the score delta between the latest two entries. Returns 0 if fewer than 2. */
export function scoreDeltas(
  history: ReadonlyArray<ScoreHistoryEntry>,
): ReadonlyArray<number> {
  if (history.length < 2) return [];
  const deltas: number[] = [];
  for (let i = 1; i < history.length; i++) {
    deltas.push((history[i]!.score as number) - (history[i - 1]!.score as number));
  }
  return deltas;
}

/** Return the moving average of scores over a window of `size` entries. */
export function movingAverage(
  history: ReadonlyArray<ScoreHistoryEntry>,
  size: number,
): ReadonlyArray<number> {
  if (size <= 0 || history.length === 0) return [];
  const result: number[] = [];
  for (let i = 0; i < history.length; i++) {
    const start = Math.max(0, i - size + 1);
    const window = history.slice(start, i + 1);
    const avg = window.reduce((s, e) => s + (e.score as number), 0) / window.length;
    result.push(avg);
  }
  return result;
}

/** In-memory ScoreHistoryStore for development and testing. */
export class InMemoryScoreHistoryStore implements ScoreHistoryStore {
  private readonly log: ScoreHistoryEntry[] = [];

  async append(entry: ScoreHistoryEntry): Promise<void> {
    this.log.push(entry);
  }

  async listByAgent(
    agentId: string,
    options: HistoryQueryOptions = {},
  ): Promise<ReadonlyArray<ScoreHistoryEntry>> {
    let results = this.log.filter((e) => e.agentId === agentId);
    if (options.since) {
      results = results.filter((e) => e.recordedAt >= options.since!);
    }
    if (options.until) {
      results = results.filter((e) => e.recordedAt <= options.until!);
    }
    results.sort((a, b) => (a.recordedAt < b.recordedAt ? -1 : 1));
    if (options.limit !== undefined) {
      results = results.slice(0, options.limit);
    }
    return results;
  }

  /** Return total entry count (test helper). */
  totalEntries(): number {
    return this.log.length;
  }
}
