// hallucination-guard gate: ensures every citation id referenced in claims exists in evidence.

import { z } from "zod";
import { ok } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { QualityGate, GateInput } from "../gate.js";
import type { GateResult } from "../result.js";
import { passed, failed } from "../result.js";
import type { Severity } from "../severity.js";

const ReportClaimSchema = z.object({
  claim: z.string(),
  citationIds: z.array(z.string()),
});

const ReportShape = z.object({
  claims: z.array(ReportClaimSchema),
});

const EvidenceShape = z.object({
  id: z.string().optional(),
  claimId: z.string().optional(),
  url: z.string().nullable().optional(),
  snippet: z.string().optional(),
});

const CitationShape = z.object({
  id: z.string(),
  sourceId: z.string().optional(),
  url: z.string().optional(),
});

export interface HallucinationGuardOptions {
  readonly failOn?: Severity;
}

/**
 * QualityGate that detects hallucinated citations — claim citation ids that have
 * no corresponding entry in the evidence or citations collections.
 */
export class HallucinationGuardGate implements QualityGate {
  readonly id = "hallucination-guard";
  readonly name = "Hallucination Guard";
  readonly failOn: Severity;

  constructor(options: HallucinationGuardOptions = {}) {
    this.failOn = options.failOn ?? "critical";
  }

  async evaluate(input: GateInput): Promise<Result<GateResult>> {
    const reportParse = ReportShape.safeParse(input.report);
    if (!reportParse.success) {
      return ok(
        failed(this.id, [
          {
            code: "REPORT_PARSE_ERROR",
            message: "Report could not be parsed for hallucination check.",
            severity: "error",
          },
        ]),
      );
    }

    // Build a set of known citation ids from both citations and evidence collections.
    const knownCitationIds = new Set<string>();

    for (const raw of input.citations) {
      const cite = CitationShape.safeParse(raw);
      if (cite.success) {
        knownCitationIds.add(cite.data.id);
      }
    }

    for (const evidenceList of Object.values(input.evidenceByClaimId)) {
      for (const raw of evidenceList) {
        const evd = EvidenceShape.safeParse(raw);
        if (evd.success && evd.data.id) {
          knownCitationIds.add(evd.data.id);
        }
      }
    }

    const { claims } = reportParse.data;
    const phantomFindings: ReturnType<typeof failed>["findings"][number][] = [];

    for (const claim of claims) {
      for (const citeId of claim.citationIds) {
        if (!knownCitationIds.has(citeId)) {
          phantomFindings.push({
            code: "PHANTOM_CITATION",
            message: `Citation "${citeId}" referenced in claim "${claim.claim.slice(0, 60)}…" has no matching evidence.`,
            severity: this.failOn,
            path: "claims[].citationIds",
          });
        }
      }
    }

    if (phantomFindings.length === 0) {
      return ok(passed(this.id));
    }

    return ok(failed(this.id, phantomFindings));
  }
}

/** Default singleton instance with critical severity for phantom citations. */
export const hallucinationGuardGate = new HallucinationGuardGate();
