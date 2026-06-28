// Fan-out strategy: dispatches a claim to all candidate agents concurrently and collects results.

import type { Result } from "@veritas/core";
import { ok, err, isOk } from "@veritas/core";
import type { VerificationReport } from "@veritas/contracts";

/** A candidate agent available for dispatch. */
export interface AgentCandidate {
  readonly agentId: string;
  readonly agentUrl: string;
  readonly priceUsdc?: bigint | string;
  readonly tier?: number;
  readonly capabilities?: readonly string[];
}

/** Function signature for dispatching work to a single agent. */
export type DispatchFn = (
  agent: AgentCandidate,
  payload: unknown,
) => Promise<Result<VerificationReport, Error>>;

/** Options controlling fan-out execution. */
export interface FanOutOptions {
  /** Maximum concurrent dispatches (default: 8). */
  readonly concurrency?: number;
  /** Per-agent timeout in milliseconds. */
  readonly timeoutMs?: number;
}

/** Outcome for a single agent within a fan-out. */
export interface AgentOutcome {
  readonly agent: AgentCandidate;
  readonly result: Result<VerificationReport, Error>;
}

/** Aggregated result of a fan-out execution. */
export interface FanOutResult {
  readonly outcomes: readonly AgentOutcome[];
  readonly successCount: number;
  readonly errorCount: number;
  readonly firstSuccess: AgentOutcome | null;
}

/** Default concurrency cap when none is specified. */
const DEFAULT_CONCURRENCY = 8;

/**
 * Dispatch a verification task to every candidate agent in parallel.
 * Returns the first successful result alongside all collected responses.
 */
export async function fanOut(
  candidates: readonly AgentCandidate[],
  dispatch: DispatchFn,
  payload: unknown,
  opts: FanOutOptions = {},
): Promise<Result<FanOutResult, Error>> {
  if (candidates.length === 0) {
    return err(new Error("fan-out: no candidates provided"));
  }

  const concurrency = opts.concurrency ?? DEFAULT_CONCURRENCY;
  const timeoutMs = opts.timeoutMs;

  const withTimeout = (
    p: Promise<Result<VerificationReport, Error>>,
  ): Promise<Result<VerificationReport, Error>> => {
    if (timeoutMs === undefined) return p;
    const timer = new Promise<Result<VerificationReport, Error>>((resolve) =>
      setTimeout(() => resolve(err(new Error("fan-out: agent timed out"))), timeoutMs),
    );
    return Promise.race([p, timer]);
  };

  const outcomes: AgentOutcome[] = [];

  const tasks = candidates.map(
    (agent): Promise<void> =>
      withTimeout(dispatch(agent, payload)).then((result) => {
        outcomes.push({ agent, result });
      }),
  );

  const chunks: Array<Array<Promise<void>>> = [];
  for (let i = 0; i < tasks.length; i += concurrency) {
    chunks.push(tasks.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    await Promise.all(chunk);
  }

  const successCount = outcomes.filter((o) => isOk(o.result)).length;
  const errorCount = outcomes.length - successCount;
  const firstSuccess = outcomes.find((o) => isOk(o.result)) ?? null;

  return ok({ outcomes, successCount, errorCount, firstSuccess });
}
