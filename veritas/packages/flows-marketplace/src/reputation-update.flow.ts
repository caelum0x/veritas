// Flow: update an agent's Provider Trust Score based on an order outcome.

import {
  type Result,
  ok,
  err,
  type EventBus,
  type Logger,
  noopLogger,
} from "@veritas/core";
import { clampPtsScore } from "@veritas/reputation";
import type { ReputationPort, OrderOutcome } from "./deps.js";
import { ReputationUpdateError } from "./errors.js";
import {
  makeReputationUpdatedEvent,
  type ReputationUpdatedPayload,
} from "./events.js";

export interface ReputationUpdateInput {
  readonly agentId: string;
  readonly outcome: OrderOutcome;
  /** Confidence in the outcome signal, in [0, 1]. */
  readonly confidence: number;
  readonly reason: string;
}

export interface ReputationUpdateOutput {
  readonly agentId: string;
  readonly previousPts: number;
  readonly newPts: number;
}

export interface ReputationUpdateFlowDeps {
  readonly reputation: ReputationPort;
  readonly eventBus?: EventBus;
  readonly logger?: Logger;
}

/** Delta applied to PTS based on order outcome and confidence. */
function outcomeDelta(outcome: OrderOutcome, confidence: number): number {
  const base: Record<OrderOutcome, number> = {
    success: 0.04,
    partial: 0.01,
    failure: -0.08,
    dispute_resolved: -0.03,
  };
  return (base[outcome] ?? 0) * Math.min(1, Math.max(0, confidence));
}

/** Update an agent's PTS from an order outcome signal. */
export async function reputationUpdateFlow(
  input: ReputationUpdateInput,
  deps: ReputationUpdateFlowDeps,
): Promise<Result<ReputationUpdateOutput>> {
  const log = deps.logger ?? noopLogger;

  // Step 1: read current score
  const currentResult = await deps.reputation.getScore(input.agentId);
  if (!currentResult.ok) {
    log.error("reputation-update: could not fetch current score", { agentId: input.agentId });
    const currentErr = currentResult.error;
    const currentMsg = currentErr instanceof Error ? currentErr.message : String(currentErr);
    return err(
      new ReputationUpdateError(
        `Could not fetch score for agent ${input.agentId}: ${currentMsg}`,
        { cause: currentErr },
      ),
    );
  }
  const previousPts = currentResult.value;

  // Step 2: compute updated score
  const delta = outcomeDelta(input.outcome, input.confidence);
  const newPts = clampPtsScore(previousPts + delta);
  log.info("reputation-update: computed new score", {
    agentId: input.agentId,
    previousPts,
    newPts,
    delta,
    outcome: input.outcome,
  });

  // Step 3: persist updated score
  const setResult = await deps.reputation.setScore(input.agentId, newPts, input.reason);
  if (!setResult.ok) {
    log.error("reputation-update: failed to persist new score", { agentId: input.agentId });
    const setErr = setResult.error;
    const setMsg = setErr instanceof Error ? setErr.message : String(setErr);
    return err(
      new ReputationUpdateError(
        `Failed to persist score for agent ${input.agentId}: ${setMsg}`,
        { cause: setErr },
      ),
    );
  }

  // Step 4: emit domain event
  if (deps.eventBus) {
    const payload: ReputationUpdatedPayload = {
      agentId: input.agentId,
      previousScore: previousPts,
      newScore: newPts,
      reason: input.reason,
    };
    deps.eventBus.publish(makeReputationUpdatedEvent(payload));
  }

  return ok({
    agentId: input.agentId,
    previousPts,
    newPts,
  });
}
