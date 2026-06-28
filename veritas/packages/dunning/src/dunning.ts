// Dunning process — orchestrates the full failed-payment recovery lifecycle for a subscription.

import { newId, Result, ok, err, epochToIso, type Logger, noopLogger } from "@veritas/core";
import type { DunningAttempt, DunningId, DunningStatus, DunningReminder } from "./types.js";
import { newDunningId } from "./types.js";
import {
  DunningStatusConflictError,
  AlreadyRecoveredError,
  MaxAttemptsExhaustedError,
} from "./errors.js";
import {
  DEFAULT_RETRY_SCHEDULE,
  maxAttempts,
  nextAttemptAt,
  validateRetrySchedule,
  type RetrySchedule,
} from "./retry-schedule.js";
import {
  createAttempt,
  executeAttempt,
  isSuccessfulAttempt,
  type PaymentGateway,
} from "./attempt.js";
import {
  dispatchReminder,
  dispatchRecoveryConfirmation,
  dispatchCancellationWarning,
  DEFAULT_REMINDER_CONFIGS,
  type ReminderConfig,
  NoopDunningNotifier,
} from "./reminder.js";
import {
  buildEscalationRecord,
  isTerminalEscalation,
  DEFAULT_ESCALATION_POLICY,
  type EscalationPolicy,
  type EscalationRecord,
} from "./escalation.js";
import type { DunningNotifier } from "./types.js";

/** A full dunning process record. */
export interface DunningProcess {
  readonly id: DunningId;
  readonly subscriptionId: string;
  readonly organizationId: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly status: DunningStatus;
  readonly attempts: readonly DunningAttempt[];
  readonly reminders: readonly DunningReminder[];
  readonly escalations: readonly EscalationRecord[];
  readonly failedAt: string;
  readonly resolvedAt: string | null;
  readonly nextRetryAt: string | null;
}

/** Options for creating and running a dunning process. */
export interface DunningOptions {
  readonly retrySchedule?: RetrySchedule;
  readonly reminderConfigs?: readonly ReminderConfig[];
  readonly escalationPolicy?: readonly EscalationPolicy[];
  readonly notifier?: DunningNotifier;
  readonly logger?: Logger;
}

/** Creates an initial dunning process for a failed payment. */
export function createDunningProcess(params: {
  subscriptionId: string;
  organizationId: string;
  amountCents: number;
  currency: string;
  failedAt?: string;
}): DunningProcess {
  const failedAt = params.failedAt ?? epochToIso(Date.now());
  return {
    id: newDunningId(),
    subscriptionId: params.subscriptionId,
    organizationId: params.organizationId,
    amountCents: params.amountCents,
    currency: params.currency,
    status: "ACTIVE",
    attempts: [],
    reminders: [],
    escalations: [],
    failedAt,
    resolvedAt: null,
    nextRetryAt: failedAt,
  };
}

type DunningStepError =
  | DunningStatusConflictError
  | AlreadyRecoveredError
  | MaxAttemptsExhaustedError;

/** Runs the next scheduled payment attempt and applies escalation/reminders. */
export async function runNextAttempt(
  process: DunningProcess,
  gateway: PaymentGateway,
  options: DunningOptions = {}
): Promise<Result<DunningProcess, DunningStepError>> {
  const {
    retrySchedule = DEFAULT_RETRY_SCHEDULE,
    reminderConfigs = DEFAULT_REMINDER_CONFIGS,
    escalationPolicy = DEFAULT_ESCALATION_POLICY,
    notifier = new NoopDunningNotifier(),
    logger = noopLogger,
  } = options;

  if (process.status === "RECOVERED") {
    return err(new AlreadyRecoveredError(process.id));
  }

  if (process.status !== "ACTIVE") {
    return err(
      new DunningStatusConflictError(process.id, process.status, "ACTIVE")
    );
  }

  const scheduleValid = validateRetrySchedule(retrySchedule);
  if (!scheduleValid.ok) {
    return err(scheduleValid.error as unknown as DunningStepError);
  }

  const attemptNumber = process.attempts.length;
  const allowed = maxAttempts(retrySchedule);

  if (attemptNumber >= allowed) {
    return err(new MaxAttemptsExhaustedError(process.id, allowed));
  }

  const attempt = createAttempt({
    dunningId: process.id,
    attemptNumber,
    amountCents: process.amountCents,
    currency: process.currency,
    scheduledAt: epochToIso(Date.now()),
  });

  const attemptResult = await executeAttempt(attempt, gateway, retrySchedule, allowed);
  if (!attemptResult.ok) {
    return err(attemptResult.error as DunningStepError);
  }

  const resolvedAttempt = attemptResult.value;
  const updatedAttempts = [...process.attempts, resolvedAttempt] as const;
  const failedCount = updatedAttempts.filter((a) => a.outcome !== "SUCCESS" && a.outcome !== "PENDING").length;

  // Send reminder for this attempt.
  const reminder = await dispatchReminder(process.id, attemptNumber, notifier, reminderConfigs);
  const updatedReminders = reminder
    ? ([...process.reminders, reminder] as const)
    : process.reminders;

  // Determine escalation action.
  const escalation = buildEscalationRecord(process.id, failedCount, escalationPolicy);
  const updatedEscalations = escalation
    ? ([...process.escalations, escalation] as const)
    : process.escalations;

  // Determine next state.
  let status: DunningStatus = process.status;
  let resolvedAt: string | null = process.resolvedAt;
  let nextRetryAt: string | null = null;

  if (isSuccessfulAttempt(resolvedAttempt)) {
    status = "RECOVERED";
    resolvedAt = epochToIso(Date.now());
    await dispatchRecoveryConfirmation(process.id, "EMAIL", notifier);
    logger.info("Dunning: payment recovered", { dunningId: process.id, attemptNumber });
  } else if (escalation && isTerminalEscalation(escalation.level)) {
    status = "EXHAUSTED";
    resolvedAt = epochToIso(Date.now());
    await dispatchCancellationWarning(process.id, "EMAIL", notifier);
    logger.warn("Dunning: max attempts exhausted, subscription cancelled", {
      dunningId: process.id,
      failedCount,
    });
  } else {
    const nextTimestamp = nextAttemptAt(retrySchedule, process.failedAt, updatedAttempts.length);
    nextRetryAt = nextTimestamp;
    logger.info("Dunning: attempt failed, scheduling retry", {
      dunningId: process.id,
      attemptNumber,
      nextRetryAt,
    });
  }

  return ok({
    ...process,
    status,
    attempts: updatedAttempts,
    reminders: updatedReminders,
    escalations: updatedEscalations,
    resolvedAt,
    nextRetryAt,
  });
}

/** Manually cancels a dunning process (e.g. when the subscription is cancelled). */
export function cancelDunningProcess(
  process: DunningProcess,
  reason: string
): Result<DunningProcess, DunningStatusConflictError | AlreadyRecoveredError> {
  if (process.status === "RECOVERED") {
    return err(new AlreadyRecoveredError(process.id));
  }
  if (process.status === "CANCELLED" || process.status === "EXHAUSTED") {
    return err(new DunningStatusConflictError(process.id, process.status, "ACTIVE"));
  }

  return ok({
    ...process,
    status: "CANCELLED",
    resolvedAt: epochToIso(Date.now()),
    nextRetryAt: null,
  });
}

/** Marks a dunning process as recovered after out-of-band payment confirmation. */
export function markRecovered(
  process: DunningProcess
): Result<DunningProcess, AlreadyRecoveredError | DunningStatusConflictError> {
  if (process.status === "RECOVERED") {
    return err(new AlreadyRecoveredError(process.id));
  }
  if (process.status === "CANCELLED" || process.status === "EXHAUSTED") {
    return err(new DunningStatusConflictError(process.id, process.status, "ACTIVE"));
  }

  return ok({
    ...process,
    status: "RECOVERED",
    resolvedAt: epochToIso(Date.now()),
    nextRetryAt: null,
  });
}
