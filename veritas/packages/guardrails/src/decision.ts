// Decision logic: aggregates per-guardrail results into a final allow/block/redact verdict.
import type { GuardrailResult, GuardrailDecision, PipelineResult, GuardrailPhase } from "./types.js";

/** Priority order: block > redact > allow */
function mergeDecisions(results: readonly GuardrailResult[]): GuardrailDecision {
  if (results.some((r) => r.decision === "block")) return "block";
  if (results.some((r) => r.decision === "redact")) return "redact";
  return "allow";
}

function buildRedactedContent(
  original: string,
  results: readonly GuardrailResult[],
): string | undefined {
  const redacted = results.find((r) => r.decision === "redact" && r.redactedContent != null);
  return redacted?.redactedContent ?? (results.some((r) => r.decision === "redact") ? original : undefined);
}

export function isBlocked(result: PipelineResult): boolean {
  return result.finalDecision === "block";
}

export function isRedacted(result: PipelineResult): boolean {
  return result.finalDecision === "redact";
}

export function isAllowed(result: PipelineResult): boolean {
  return result.finalDecision === "allow";
}

export function resolveDecision(
  requestId: string,
  phase: GuardrailPhase,
  original: string,
  results: readonly GuardrailResult[],
): PipelineResult {
  const finalDecision = mergeDecisions(results);
  return {
    requestId,
    phase,
    finalDecision,
    results,
    redactedContent: finalDecision === "redact" ? buildRedactedContent(original, results) : undefined,
  };
}
