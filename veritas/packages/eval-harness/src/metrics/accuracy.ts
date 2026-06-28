// Verdict accuracy metric: fraction of expected claim verdicts matched exactly.
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Metric, MetricContext } from "../metric.js";
import { MetricError } from "../errors.js";

/**
 * Computes accuracy as the proportion of expected claim verdicts that the
 * report matched exactly (by normalised claim text substring match + verdict).
 */
export const verdictAccuracyMetric: Metric = {
  id: "verdict_accuracy",
  description: "Fraction of expected claim verdicts reproduced correctly in the report.",

  score(ctx: MetricContext): Result<number, MetricError> {
    const { evalCase, report } = ctx;
    const expected = evalCase.expectedVerdicts;

    if (expected.length === 0) {
      return err(new MetricError("No expected verdicts defined for this case"));
    }

    let matches = 0;
    for (const exp of expected) {
      const normalised = exp.claimText.toLowerCase().trim();
      // Find the best-matching reported claim by substring overlap
      const found = report.claims.find((rc) =>
        rc.claim.toLowerCase().includes(normalised) ||
        normalised.includes(rc.claim.toLowerCase().trim())
      );
      if (found && found.verdict === exp.verdict) {
        matches++;
      }
    }

    return ok(matches / expected.length);
  },
};
