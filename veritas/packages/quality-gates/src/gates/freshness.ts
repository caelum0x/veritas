// freshness gate: ensures evidence and source documents are not older than a configurable threshold.

import { ok } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { QualityGate, GateInput } from "../gate.js";
import { passed, failed } from "../result.js";
import type { GateResult, GateFinding } from "../result.js";
import type { Severity } from "../severity.js";
import { z } from "zod";

const GATE_ID = "freshness";

/** Days in common time units. */
const MS_PER_DAY = 86_400_000;

const sourceShape = z.object({
  id: z.string().optional(),
  url: z.string().optional(),
  publishedAt: z.string().nullable().optional(),
  retrievedAt: z.string().optional(),
});

/** Parse an ISO-8601 string to epoch ms; returns NaN on failure. */
function toEpoch(value: string | null | undefined): number {
  if (!value) return NaN;
  const ms = Date.parse(value);
  return isNaN(ms) ? NaN : ms;
}

export function createFreshnessGate(options: {
  /** Maximum allowed age of a source in days (default: 730, i.e. 2 years). */
  maxAgeDays?: number;
  /** Severity for stale sources (default: "warning"). */
  staleSeverity?: Severity;
  failOn?: Severity;
} = {}): QualityGate {
  const maxAgeDays = options.maxAgeDays ?? 730;
  const staleSeverity: Severity = options.staleSeverity ?? "warning";

  return {
    id: GATE_ID,
    name: "Evidence Freshness",
    failOn: options.failOn ?? "warning",

    async evaluate(input: GateInput): Promise<Result<GateResult>> {
      const findings: GateFinding[] = [];
      const asOfMs = Date.parse(input.asOf);

      if (isNaN(asOfMs)) {
        return ok(failed(GATE_ID, [
          {
            code: "freshness.invalid-asof",
            message: `The 'asOf' timestamp "${input.asOf}" is not a valid ISO-8601 date.`,
            severity: "error",
          },
        ]));
      }

      let checkedCount = 0;
      let staleCount = 0;

      for (let i = 0; i < input.sources.length; i++) {
        const raw = input.sources[i];
        const parsed = sourceShape.safeParse(raw);
        if (!parsed.success) continue;

        // Prefer publishedAt; fall back to retrievedAt.
        const dateMs =
          toEpoch(parsed.data.publishedAt) ||
          toEpoch(parsed.data.retrievedAt);

        if (isNaN(dateMs)) {
          findings.push({
            code: "freshness.missing-date",
            message: `Source at index ${i} has no parseable publishedAt or retrievedAt date.`,
            severity: "info",
            path: `sources[${i}]`,
          });
          continue;
        }

        checkedCount++;
        const ageDays = (asOfMs - dateMs) / MS_PER_DAY;

        if (ageDays > maxAgeDays) {
          staleCount++;
          const label =
            parsed.data.url ??
            parsed.data.id ??
            `index ${i}`;
          findings.push({
            code: "freshness.stale-source",
            message: `Source "${label}" is ${Math.round(ageDays)} days old, exceeding the ${maxAgeDays}-day limit.`,
            severity: staleSeverity,
            path: `sources[${i}].publishedAt`,
          });
        }
      }

      const metric = checkedCount > 0 ? staleCount / checkedCount : 0;

      if (findings.some((f) => f.severity !== "info")) {
        return ok(failed(GATE_ID, findings, metric));
      }
      return ok(passed(GATE_ID, metric));
    },
  };
}
