// citation-coverage gate: verifies every claim in the report has at least one citation.

import { z } from "zod";
import { ok } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { QualityGate, GateInput } from "../gate.js";
import type { GateResult } from "../result.js";
import { passed, failed } from "../result.js";
import type { Severity } from "../severity.js";

const ReportClaimSchema = z.object({
  claim: z.string(),
  verdict: z.string(),
  confidence: z.number(),
  reasoning: z.string(),
  citationIds: z.array(z.string()),
});

const ReportSchema = z.object({
  claims: z.array(ReportClaimSchema),
});

export interface CitationCoverageOptions {
  /** Minimum fraction of claims that must have citations (default 1.0 = 100%). */
  readonly minCoverageRatio?: number;
  readonly failOn?: Severity;
}

/** QualityGate that ensures every claim is backed by at least one citation. */
export class CitationCoverageGate implements QualityGate {
  readonly id = "citation-coverage";
  readonly name = "Citation Coverage";
  readonly failOn: Severity;

  private readonly minCoverageRatio: number;

  constructor(options: CitationCoverageOptions = {}) {
    this.minCoverageRatio = options.minCoverageRatio ?? 1.0;
    this.failOn = options.failOn ?? "error";
  }

  async evaluate(input: GateInput): Promise<Result<GateResult>> {
    const parseResult = ReportSchema.safeParse(input.report);
    if (!parseResult.success) {
      return ok(
        failed(this.id, [
          {
            code: "REPORT_PARSE_ERROR",
            message: "Report does not match expected schema for citation coverage check.",
            severity: "error",
          },
        ]),
      );
    }

    const { claims } = parseResult.data;
    if (claims.length === 0) {
      return ok(passed(this.id, 1));
    }

    const uncited = claims.filter((c) => c.citationIds.length === 0);
    const coverageRatio = (claims.length - uncited.length) / claims.length;

    if (coverageRatio >= this.minCoverageRatio) {
      return ok(passed(this.id, coverageRatio));
    }

    const findings = uncited.map((c) => ({
      code: "UNCITED_CLAIM",
      message: `Claim has no citations: "${c.claim.slice(0, 80)}${c.claim.length > 80 ? "…" : ""}"`,
      severity: this.failOn,
      path: "claims[].citationIds",
    }));

    return ok(failed(this.id, findings, coverageRatio));
  }
}

/** Default singleton instance with strict 100% coverage requirement. */
export const citationCoverageGate = new CitationCoverageGate();
