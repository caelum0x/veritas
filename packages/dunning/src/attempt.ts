// Payment attempt — records and evaluates individual retry attempts within a dunning cycle.

import { newId, Result, ok, err, epochToIso, asIsoTimestamp } from "@veritas/core";
import type { AttemptOutcome, DunningAttempt, AttemptId, DunningId } from "./types.js";
import { AttemptNotFoundError, MaxAttemptsExhaustedError } from "./errors.js";
import { nextAttemptAt, type RetrySchedule } from "./retry-schedule.js";

/** Port interface for executing payment charges against an external payment provider. */
export interface PaymentGateway {
  charge(params: {
    organizationId: string;
    amountCents: number;
    currency: string;
    idempotencyKey: string;
  }): Promise<{ outcome: AttemptOutcome; errorCode?: string; errorMessage?: string }>;
}

/** In-memory mock payment gateway for testing and development. */
export class MockPaymentGateway implements PaymentGateway {
  private readonly _alwaysSucceed: boolean;

  constructor(alwaysSucceed = false) {
    this._alwaysSucceed = alwaysSucceed;
  }

  async charge(_params: {
    organizationId: string;
    amountCents: number;
    currency: string;
    idempotencyKey: string;
  }): Promise<{ outcome: AttemptOutcome; errorCode?: string; errorMessage?: string }> {
    if (this._alwaysSucceed) {
      return { outcome: "SUCCESS" };
    }
    return { outcome: "DECLINED", errorCode: "do_not_honor", errorMessage: "Card declined" };
  }
}

/** Creates a new attempt record in PENDING state. */
export function createAttempt(params: {
  dunningId: DunningId;
  attemptNumber: number;
  amountCents: number;
  currency: string;
  scheduledAt: string;
}): DunningAttempt {
  return {
    id: newId("att") as unknown as AttemptId,
    dunningId: params.dunningId,
    attemptNumber: params.attemptNumber,
    outcome: "PENDING",
    amountCents: params.amountCents,
    currency: params.currency,
    attemptedAt: asIsoTimestamp(params.scheduledAt),
  };
}

/** Resolves an attempt with the final outcome from the payment gateway. */
export function resolveAttempt(
  attempt: DunningAttempt,
  outcome: AttemptOutcome,
  schedule: RetrySchedule,
  errorCode?: string,
  errorMessage?: string
): DunningAttempt {
  const nextRetryAtRaw = outcome !== "SUCCESS"
    ? nextAttemptAt(schedule, attempt.attemptedAt, attempt.attemptNumber + 1)
    : null;
  const nextRetryAt = nextRetryAtRaw != null ? asIsoTimestamp(nextRetryAtRaw) : undefined;

  return {
    ...attempt,
    outcome,
    errorCode,
    errorMessage,
    nextRetryAt,
    attemptedAt: epochToIso(Date.now()),
  };
}

/**
 * Executes a payment charge via the gateway and returns the resolved attempt.
 * Returns Err if max attempts have already been reached.
 */
export async function executeAttempt(
  attempt: DunningAttempt,
  gateway: PaymentGateway,
  schedule: RetrySchedule,
  maxAllowed: number
): Promise<Result<DunningAttempt, MaxAttemptsExhaustedError | AttemptNotFoundError>> {
  if (attempt.attemptNumber >= maxAllowed) {
    return err(
      new MaxAttemptsExhaustedError(attempt.dunningId, maxAllowed)
    );
  }

  const result = await gateway.charge({
    organizationId: attempt.dunningId,
    amountCents: attempt.amountCents,
    currency: attempt.currency,
    idempotencyKey: `${attempt.dunningId}-attempt-${attempt.attemptNumber}`,
  });

  const resolved = resolveAttempt(
    attempt,
    result.outcome,
    schedule,
    result.errorCode,
    result.errorMessage
  );

  return ok(resolved);
}

/** Returns true if the attempt outcome represents a terminal success. */
export function isSuccessfulAttempt(attempt: DunningAttempt): boolean {
  return attempt.outcome === "SUCCESS";
}

/** Returns true if the attempt outcome represents a retriable failure. */
export function isRetriableOutcome(outcome: AttemptOutcome): boolean {
  return outcome === "NETWORK_ERROR" || outcome === "INSUFFICIENT_FUNDS";
}

/** Returns true if the attempt outcome represents a non-retriable hard decline. */
export function isHardDecline(outcome: AttemptOutcome): boolean {
  return (
    outcome === "DECLINED" ||
    outcome === "EXPIRED_CARD" ||
    outcome === "DO_NOT_HONOR"
  );
}
