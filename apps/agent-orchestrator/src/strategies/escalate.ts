// Escalation strategy: tries agents in tier order, advancing only when lower tiers fail or are insufficient.

import type { Result } from "@veritas/core";
import { ok, err, isOk } from "@veritas/core";
import type { VerificationReport } from "@veritas/contracts";
import type { AgentCandidate, DispatchFn } from "./fan-out.js";

/** Options controlling escalation behaviour. */
export interface EscalationOptions {
  /** Minimum confidence below which the next tier is tried (default: 0.7). */
  readonly confidenceThreshold?: number;
}

/** Record of a single tier attempt. */
export interface EscalationAttempt {
  readonly tierIdx: number;
  readonly agent: AgentCandidate;
  readonly result: Result<VerificationReport, Error>;
  /** Whether escalation to the next tier was triggered. */
  readonly escalated: boolean;
}

/** Aggregated result of an escalation run. */
export interface EscalationResult {
  readonly attempts: readonly EscalationAttempt[];
  readonly finalTierIdx: number;
  readonly report: VerificationReport;
}

/** Default confidence threshold below which results are escalated to a higher tier. */
const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;

/** Extract confidence from a report if present, defaulting to 1 (fully confident). */
function confidenceOf(report: VerificationReport): number {
  const r = report as VerificationReport & { confidence?: number };
  return typeof r.confidence === "number" ? r.confidence : 1;
}

/**
 * Attempt verification with the cheapest/fastest tier first.
 * Escalates to higher tiers when confidence is below threshold or the attempt fails.
 */
export async function escalate(
  tiers: readonly (readonly AgentCandidate[])[],
  dispatch: DispatchFn,
  payload: unknown,
  opts: EscalationOptions = {},
): Promise<Result<EscalationResult, Error>> {
  if (tiers.length === 0) {
    return err(new Error("escalate: no tiers provided"));
  }

  const threshold = opts.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  const attempts: EscalationAttempt[] = [];

  for (let tierIdx = 0; tierIdx < tiers.length; tierIdx++) {
    const candidates = tiers[tierIdx];
    if (candidates === undefined || candidates.length === 0) continue;

    const agent = candidates[0];
    if (agent === undefined) continue;

    const result = await dispatch(agent, payload);

    if (!isOk(result)) {
      attempts.push({ tierIdx, agent, result, escalated: true });
      continue;
    }

    const report = result.value;
    const confidence = confidenceOf(report);
    const escalated = confidence < threshold && tierIdx < tiers.length - 1;
    attempts.push({ tierIdx, agent, result, escalated });

    if (!escalated) {
      return ok({ attempts, finalTierIdx: tierIdx, report });
    }
  }

  const lastSuccess = [...attempts].reverse().find((a) => isOk(a.result));
  if (lastSuccess !== undefined && isOk(lastSuccess.result)) {
    return ok({ attempts, finalTierIdx: lastSuccess.tierIdx, report: lastSuccess.result.value });
  }

  return err(new Error("escalate: all tiers exhausted without a successful result"));
}
