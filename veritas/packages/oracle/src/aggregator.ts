// Aggregator: combine multiple oracle answers using a configurable strategy.
import { ok, err, type Result } from "@veritas/core";
import type { FeedAnswer, AggregationStrategy, FeedId } from "./types.js";
import { AggregationError } from "./errors.js";

/** Input set of answers to aggregate (must all share the same feedId). */
export interface AggregationInput {
  readonly feedId: FeedId;
  readonly answers: readonly FeedAnswer[];
  readonly strategy: AggregationStrategy;
}

/** Result of aggregation: a synthetic FeedAnswer derived from multiple sources. */
export interface AggregatedAnswer {
  readonly feedId: FeedId;
  readonly answer: bigint;
  readonly decimals: number;
  readonly updatedAt: number;
  readonly startedAt: number;
  readonly roundId: bigint;
  readonly sourcesUsed: number;
  readonly strategy: AggregationStrategy;
}

/** Aggregate a set of FeedAnswers according to the chosen strategy. */
export function aggregate(input: AggregationInput): Result<AggregatedAnswer> {
  const { feedId, answers, strategy } = input;

  if (answers.length === 0) {
    return err(new AggregationError(`No answers provided for feed ${feedId}`));
  }

  const decimals = answers[0]!.decimals;
  const mismatched = answers.find((a) => a.decimals !== decimals);
  if (mismatched !== undefined) {
    return err(
      new AggregationError(
        `Decimal mismatch in feed ${feedId}: expected ${decimals}, got ${mismatched.decimals}`,
      ),
    );
  }

  const values = answers.map((a) => a.answer);
  const aggregated = computeStrategy(values, strategy);

  if (aggregated === undefined) {
    return err(new AggregationError(`Strategy ${strategy} failed for feed ${feedId}`));
  }

  const updatedAt = Math.max(...answers.map((a) => a.updatedAt));
  const startedAt = Math.min(...answers.map((a) => a.startedAt));
  const roundId = answers.reduce((max, a) => (a.roundId > max ? a.roundId : max), 0n);

  return ok({
    feedId,
    answer: aggregated,
    decimals,
    updatedAt,
    startedAt,
    roundId,
    sourcesUsed: answers.length,
    strategy,
  });
}

function computeStrategy(
  values: readonly bigint[],
  strategy: AggregationStrategy,
): bigint | undefined {
  if (values.length === 0) return undefined;
  switch (strategy) {
    case "median":
      return bigintMedian(values);
    case "mean":
      return bigintMean(values);
    case "min":
      return values.reduce((a, b) => (b < a ? b : a));
    case "max":
      return values.reduce((a, b) => (b > a ? b : a));
  }
}

function bigintMedian(values: readonly bigint[]): bigint {
  const sorted = [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2n;
}

function bigintMean(values: readonly bigint[]): bigint {
  const sum = values.reduce((acc, v) => acc + v, 0n);
  return sum / BigInt(values.length);
}
