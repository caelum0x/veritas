// confidence-sanity gate: verifies that each claim's confidence score is consistent with its verdict.

import { ok } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { QualityGate, GateInput } from "../gate.js";
import { passed, failed } from "../result.js";
import type { GateResult, GateFinding } from "../result.js";
import type { Severity } from "../severity.js";
import { z } from "zod";

const GATE_ID = "confidence-sanity";

/** Expected confidence floor per verdict. */
const CONFIDENCE_FLOORS: Record<string, number> = {
  supported: 0.6,
  refuted: 0.6,
  unverifiable: 0.0,
};

/** Expected confidence ceiling per verdict. Unverifiable claims should not be highly confident. */
const CONFIDENCE_CEILINGS: Record<string, number> = {
  supported: 1.0,
  refuted: 1.0,
  unverifiable: 0.55,
};

const claimShape = z.object({
  claim: z.string(),
  verdict: z.string(),
  confidence: z.number().min(0).max(1),
});

const reportShape = z.object({
  claims: z.array(z.unknown()),
});

export function createConfidenceSanityGate(options: {
  failOn?: Severity;
} = {}): QualityGate {
  return {
    id: GATE_ID,
    name: "Confidence Sanity",
    failOn: options.failOn ?? "error",

    async evaluate(input: GateInput): Promise<Result<GateResult>> {
      const reportParsed = reportShape.safeParse(input.report);
      if (!reportParsed.success) {
        return ok(failed(GATE_ID, [
          {
            code: "confidence-sanity.invalid-report",
            message: "Report does not contain a claims array.",
            severity: "error",
          },
        ]));
      }

      const findings: GateFinding[] = [];

      for (let i = 0; i < reportParsed.data.claims.length; i++) {
        const raw = reportParsed.data.claims[i];
        const parsed = claimShape.safeParse(raw);
        if (!parsed.success) {
          findings.push({
            code: "confidence-sanity.unparseable-claim",
            message: `Claim at index ${i} could not be parsed for confidence sanity check.`,
            severity: "warning",
            path: `claims[${i}]`,
          });
          continue;
        }

        const { verdict, confidence } = parsed.data;
        const floor = CONFIDENCE_FLOORS[verdict] ?? 0;
        const ceiling = CONFIDENCE_CEILINGS[verdict] ?? 1;

        if (confidence < floor) {
          findings.push({
            code: "confidence-sanity.below-floor",
            message: `Claim "${parsed.data.claim.slice(0, 60)}" has verdict "${verdict}" but confidence ${confidence.toFixed(2)} is below expected floor ${floor}.`,
            severity: "error",
            path: `claims[${i}].confidence`,
          });
        }

        if (confidence > ceiling) {
          findings.push({
            code: "confidence-sanity.above-ceiling",
            message: `Claim "${parsed.data.claim.slice(0, 60)}" has verdict "${verdict}" but confidence ${confidence.toFixed(2)} exceeds ceiling ${ceiling}.`,
            severity: "warning",
            path: `claims[${i}].confidence`,
          });
        }
      }

      if (findings.length === 0) {
        return ok(passed(GATE_ID));
      }
      return ok(failed(GATE_ID, findings));
    },
  };
}
