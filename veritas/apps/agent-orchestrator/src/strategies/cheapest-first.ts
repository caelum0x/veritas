// Cheapest-first strategy: sorts candidates by cost and tries them in ascending price order.

import type { Result } from "@veritas/core";
import { ok, err, isOk } from "@veritas/core";
import type { VerificationReport } from "@veritas/contracts";
import type { AgentCandidate, DispatchFn } from "./fan-out.js";

/** Options controlling cheapest-first execution. */
export interface CheapestFirstOptions {
  /** Maximum number of candidates to attempt before giving up. */
  readonly maxAttempts?: number;
}

/** Record of a single attempt within cheapest-first. */
export interface CheapestFirstAttempt {
  readonly agent: AgentCandidate;
  readonly result: Result<VerificationReport, Error>;
}

/** Result of a successful cheapest-first run. */
export interface CheapestFirstResult {
  readonly attempts: readonly CheapestFirstAttempt[];
  readonly winner: AgentCandidate;
  readonly report: VerificationReport;
}

/** Sort candidates by quoted price in ascending order (returns a new array). */
function sortByCost(candidates: readonly AgentCandidate[]): readonly AgentCandidate[] {
  return [...candidates].sort((a, b) => {
    const aPrice = typeof a.priceUsdc === "bigint" ? a.priceUsdc : BigInt(a.priceUsdc ?? 0);
    const bPrice = typeof b.priceUsdc === "bigint" ? b.priceUsdc : BigInt(b.priceUsdc ?? 0);
    return aPrice < bPrice ? -1 : aPrice > bPrice ? 1 : 0;
  });
}

/**
 * Try agents in ascending price order, returning the first successful result.
 * All attempts are recorded so callers can inspect cost/quality trade-offs.
 */
export async function cheapestFirst(
  candidates: readonly AgentCandidate[],
  dispatch: DispatchFn,
  payload: unknown,
  opts: CheapestFirstOptions = {},
): Promise<Result<CheapestFirstResult, Error>> {
  if (candidates.length === 0) {
    return err(new Error("cheapest-first: no candidates provided"));
  }

  const maxAttempts = opts.maxAttempts ?? candidates.length;
  const sorted = sortByCost(candidates).slice(0, maxAttempts);
  const attempts: CheapestFirstAttempt[] = [];

  for (const agent of sorted) {
    const result = await dispatch(agent, payload);
    attempts.push({ agent, result });

    if (isOk(result)) {
      return ok({ attempts, winner: agent, report: result.value });
    }
  }

  return err(new Error(`cheapest-first: all ${sorted.length} candidates failed`));
}
