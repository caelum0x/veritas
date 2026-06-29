// Guardrail metric evaluation — block or warn when metric crosses threshold
import { z } from "zod";
import type { Guardrail } from "./types.js";
import type { VariantStats } from "./analysis.js";

export const GuardrailCheckResultSchema = z.object({
  guardrailId: z.string(),
  variantId: z.string(),
  name: z.string(),
  threshold: z.number(),
  direction: z.enum(["above", "below"]),
  severity: z.enum(["warning", "blocking"]),
  actualValue: z.number(),
  violated: z.boolean(),
  message: z.string(),
});

export type GuardrailCheckResult = z.infer<typeof GuardrailCheckResultSchema>;

export const GuardrailSummarySchema = z.object({
  experimentId: z.string(),
  variantId: z.string(),
  results: z.array(GuardrailCheckResultSchema),
  anyBlocking: z.boolean(),
  anyViolated: z.boolean(),
  checkedAt: z.string(),
});

export type GuardrailSummary = z.infer<typeof GuardrailSummarySchema>;

/** Map a guardrail to a numeric value from variant stats */
function extractValue(guardrail: Guardrail, stats: VariantStats): number {
  // Guardrail.metricId corresponds to a metric; use mean as the observed value
  return stats.mean;
}

/** Check whether a single guardrail is violated for a variant */
export function checkGuardrail(
  guardrail: Guardrail,
  stats: VariantStats
): GuardrailCheckResult {
  const actualValue = extractValue(guardrail, stats);
  let violated: boolean;

  if (guardrail.direction === "above") {
    violated = actualValue > guardrail.threshold;
  } else {
    violated = actualValue < guardrail.threshold;
  }

  const dirLabel =
    guardrail.direction === "above" ? "exceeded upper bound" : "fell below lower bound";
  const message = violated
    ? `Guardrail "${guardrail.name}" ${dirLabel}: ${actualValue.toFixed(4)} vs threshold ${guardrail.threshold}`
    : `Guardrail "${guardrail.name}" OK: ${actualValue.toFixed(4)}`;

  return {
    guardrailId: guardrail.id,
    variantId: stats.variantId,
    name: guardrail.name,
    threshold: guardrail.threshold,
    direction: guardrail.direction,
    severity: guardrail.severity,
    actualValue,
    violated,
    message,
  };
}

/** Evaluate all guardrails for a single variant and return a summary */
export function evaluateGuardrails(
  experimentId: string,
  guardrails: readonly Guardrail[],
  stats: VariantStats
): GuardrailSummary {
  const results = guardrails.map((g) => checkGuardrail(g, stats));
  const anyViolated = results.some((r) => r.violated);
  const anyBlocking = results.some((r) => r.violated && r.severity === "blocking");

  return {
    experimentId,
    variantId: stats.variantId,
    results,
    anyBlocking,
    anyViolated,
    checkedAt: new Date().toISOString(),
  };
}

/** Evaluate guardrails across all variants; returns summaries per variant */
export function evaluateAllVariants(
  experimentId: string,
  guardrails: readonly Guardrail[],
  variantStats: readonly VariantStats[]
): readonly GuardrailSummary[] {
  return variantStats.map((stats) =>
    evaluateGuardrails(experimentId, guardrails, stats)
  );
}

/** Returns true if any blocking guardrail is violated across all variants */
export function hasBlockingViolation(
  summaries: readonly GuardrailSummary[]
): boolean {
  return summaries.some((s) => s.anyBlocking);
}
