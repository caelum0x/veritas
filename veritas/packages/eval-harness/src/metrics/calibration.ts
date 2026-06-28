// Calibration metric: measures how well reported confidence correlates with verdict accuracy.
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Metric, MetricContext } from "../metric.js";
import { MetricError } from "../errors.js";

/**
 * Calibration score: for each expected verdict, find the matching claim and
 * measure expected calibration error (ECE) across confidence buckets.
 * Returns 1 - ECE so that higher is better (consistent with other metrics).
 */
export const calibrationMetric: Metric = {
  id: "calibration",
  description:
    "Measures confidence calibration: 1 minus the expected calibration error between reported confidence and verdict accuracy.",

  score(ctx: MetricContext): Result<number, MetricError> {
    const { evalCase, report } = ctx;
    const expected = evalCase.expectedVerdicts;

    if (expected.length === 0) {
      return err(new MetricError("No expected verdicts defined; cannot compute calibration"));
    }

    // Pair each expected verdict with the best-matching report claim
    const pairs: Array<{ correct: boolean; confidence: number }> = [];

    for (const exp of expected) {
      const normalised = exp.claimText.toLowerCase().trim();
      const found = report.claims.find(
        (rc) =>
          rc.claim.toLowerCase().includes(normalised) ||
          normalised.includes(rc.claim.toLowerCase().trim())
      );
      if (found !== undefined) {
        pairs.push({
          correct: found.verdict === exp.verdict,
          confidence: found.confidence,
        });
      }
    }

    if (pairs.length === 0) {
      return err(new MetricError("No claims matched expected verdicts; cannot compute calibration"));
    }

    // Bucket into 10 equal-width confidence intervals [0, 0.1), [0.1, 0.2), ...
    const BUCKETS = 10;
    const buckets: Array<{ total: number; correct: number; sumConf: number }> =
      Array.from({ length: BUCKETS }, () => ({ total: 0, correct: 0, sumConf: 0 }));

    for (const { correct, confidence } of pairs) {
      const idx = Math.min(Math.floor(confidence * BUCKETS), BUCKETS - 1);
      const bucket = buckets[idx]!;
      bucket.total++;
      bucket.sumConf += confidence;
      if (correct) bucket.correct++;
    }

    // Expected calibration error = weighted mean |accuracy - avg_confidence| per bucket
    let ece = 0;
    for (const bucket of buckets) {
      if (bucket.total === 0) continue;
      const avgConf = bucket.sumConf / bucket.total;
      const accuracy = bucket.correct / bucket.total;
      ece += (bucket.total / pairs.length) * Math.abs(accuracy - avgConf);
    }

    return ok(1 - ece);
  },
};
