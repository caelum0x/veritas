// Segment-level NPS — groups responses by a dimension and computes per-segment scores.
import { Result, ok, err, isOk } from "@veritas/core";
import { NpsResponse } from "./response.js";
import { NpsScoreBreakdown, computeNpsScore } from "./score.js";
import { SegmentKey } from "./types.js";

export interface SegmentScore {
  readonly segmentKey: SegmentKey;
  readonly segmentValue: string;
  readonly score: NpsScoreBreakdown;
}

export interface SegmentReport {
  readonly segmentKey: SegmentKey;
  readonly segments: readonly SegmentScore[];
  readonly overall: NpsScoreBreakdown;
}

const groupBySegmentValue = (
  responses: readonly NpsResponse[],
  key: SegmentKey
): Map<string, NpsResponse[]> => {
  const map = new Map<string, NpsResponse[]>();
  for (const r of responses) {
    const value = r.metadata?.[key] ?? "__unknown__";
    const bucket = map.get(value) ?? [];
    bucket.push(r);
    map.set(value, bucket);
  }
  return map;
};

export const computeSegmentScores = (
  responses: readonly NpsResponse[],
  segmentKey: SegmentKey
): Result<SegmentReport, Error> => {
  if (responses.length === 0) {
    return err(new Error("No responses to segment"));
  }

  const overallResult = computeNpsScore(responses);
  if (!isOk(overallResult)) return overallResult;

  const groups = groupBySegmentValue(responses, segmentKey);
  const segments: SegmentScore[] = [];

  for (const [value, bucket] of groups) {
    const scoreResult = computeNpsScore(bucket);
    if (!isOk(scoreResult)) continue; // skip empty buckets (shouldn't happen)
    segments.push(
      Object.freeze({
        segmentKey,
        segmentValue: value,
        score: scoreResult.value,
      })
    );
  }

  // Sort descending by NPS for readability.
  const sorted = [...segments].sort((a, b) => b.score.nps - a.score.nps);

  return ok(
    Object.freeze({
      segmentKey,
      segments: Object.freeze(sorted),
      overall: overallResult.value,
    })
  );
};

export const topSegments = (
  report: SegmentReport,
  n: number
): readonly SegmentScore[] => report.segments.slice(0, Math.max(1, n));

export const bottomSegments = (
  report: SegmentReport,
  n: number
): readonly SegmentScore[] =>
  [...report.segments].reverse().slice(0, Math.max(1, n));
