// dunning.flow.ts: failed payment -> create dunning process -> retry -> recover or exhaust
import {
  ok,
  err,
  isErr,
  isOk,
  type Result,
  type AppError,
  type Logger,
  type EventBus,
  epochToIso,
  newId,
  InternalError,
} from "@veritas/core";
import {
  createDunningProcess,
  runNextAttempt,
  markRecovered,
  type DunningProcess,
  type DunningOptions,
} from "@veritas/dunning";
import type { PaymentGateway } from "@veritas/dunning";

export interface DunningFlowDeps {
  readonly paymentGateway: PaymentGateway;
  readonly eventBus: EventBus;
  readonly logger: Logger;
  readonly dunningOptions?: DunningOptions;
}

export interface DunningFlowInput {
  readonly subscriptionId: string;
  readonly organizationId: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly failedAt?: string;
}

export interface DunningFlowOutput {
  readonly dunningId: string;
  readonly subscriptionId: string;
  readonly organizationId: string;
  readonly status: string;
  readonly attemptCount: number;
  readonly resolvedAt: string | null;
  readonly nextRetryAt: string | null;
}

/** Start dunning for a failed payment, attempt recovery, and emit lifecycle events. */
export async function runDunningFlow(
  input: DunningFlowInput,
  deps: DunningFlowDeps,
): Promise<Result<DunningFlowOutput, AppError>> {
  const { subscriptionId, organizationId, amountCents, currency, failedAt } = input;
  const { paymentGateway, eventBus, logger, dunningOptions } = deps;

  // Step 1: Create dunning process record
  const process: DunningProcess = createDunningProcess({
    subscriptionId,
    organizationId,
    amountCents,
    currency,
    failedAt,
  });

  const startedAt = epochToIso(Date.now());

  logger.info("dunning_flow.started", {
    dunningId: process.id,
    subscriptionId,
    organizationId,
    amountCents,
    currency,
  });

  // Step 2: Emit dunning-started event
  await eventBus.publish({
    id: newId("evt"),
    type: "commerce.dunning.started",
    occurredAt: startedAt,
    payload: {
      dunningId: process.id,
      subscriptionId,
      organizationId,
      amountCents,
      currency,
    },
  } as Parameters<typeof eventBus.publish>[0]);

  // Step 3: Run the first retry attempt
  const attemptResult = await runNextAttempt(
    process,
    paymentGateway,
    dunningOptions ?? {},
  );

  if (isErr(attemptResult)) {
    logger.error("dunning_flow.attempt_failed", {
      dunningId: process.id,
      error: attemptResult.error,
    });
    return err(new InternalError({ message: String(attemptResult.error) }));
  }

  const updatedProcess = attemptResult.value;
  const resolvedAt = epochToIso(Date.now());

  // Step 4: Emit outcome event
  const eventType =
    updatedProcess.status === "RECOVERED"
      ? "commerce.dunning.recovered"
      : updatedProcess.status === "EXHAUSTED"
      ? "commerce.dunning.exhausted"
      : "commerce.dunning.retry_scheduled";

  await eventBus.publish({
    id: newId("evt"),
    type: eventType,
    occurredAt: resolvedAt,
    payload: {
      dunningId: updatedProcess.id,
      subscriptionId,
      organizationId,
      status: updatedProcess.status,
      attemptCount: updatedProcess.attempts.length,
      nextRetryAt: updatedProcess.nextRetryAt,
    },
  } as Parameters<typeof eventBus.publish>[0]);

  logger.info("dunning_flow.completed", {
    dunningId: updatedProcess.id,
    status: updatedProcess.status,
    attemptCount: updatedProcess.attempts.length,
  });

  return ok({
    dunningId: updatedProcess.id,
    subscriptionId: updatedProcess.subscriptionId,
    organizationId: updatedProcess.organizationId,
    status: updatedProcess.status,
    attemptCount: updatedProcess.attempts.length,
    resolvedAt: updatedProcess.resolvedAt,
    nextRetryAt: updatedProcess.nextRetryAt,
  });
}
