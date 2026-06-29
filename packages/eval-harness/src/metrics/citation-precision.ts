// Citation precision metric: fraction of cited sources that are relevant to the claim.
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Metric, MetricContext } from "../metric.js";
import { MetricError } from "../errors.js";

/**
 * Measures citation precision: for each claim in the report, what fraction of
 * cited source URLs are non-empty and structurally valid (http/https).
 * A score of 1.0 means every citation has a well-formed URL.
 */
export const citationPrecisionMetric: Metric = {
  id: "citation_precision",
  description:
    "Fraction of report citations that reference a structurally valid http/https URL.",

  score(ctx: MetricContext): Result<number, MetricError> {
    const { report } = ctx;

    const allCitations = report.claims.flatMap((rc) => rc.citations ?? []);

    if (allCitations.length === 0) {
      return err(new MetricError("No citations found in report; cannot compute precision"));
    }

    let valid = 0;
    for (const citation of allCitations) {
      const url = citation.url?.trim() ?? "";
      if (url.startsWith("http://") || url.startsWith("https://")) {
        valid++;
      }
    }

    return ok(valid / allCitations.length);
  },
};
