// Flow: validate an active trial then convert it to a paid subscription and advance lifecycle stage.
import { ok, err, type Result, type UserId, type Clock, newId } from "@veritas/core";
import {
  type Trial,
  type TrialId,
  TrialNotFoundError,
  TrialNotActiveError,
} from "@veritas/trials";
import {
  createLifecycleEngine,
  createJourney,
  type LifecycleStore,
} from "@veritas/lifecycle";
import { type Logger } from "@veritas/observability";

export interface ConvertTrialStore {
  findTrial(trialId: string): Promise<Trial | null>;
  saveTrial(trial: Trial): Promise<void>;
}

export interface SubscriptionRecord {
  readonly id: string;
  readonly userId: UserId;
  readonly planId: string;
  readonly status: "active";
  readonly startedAt: string;
  readonly trialId: string;
}

export interface SubscriptionStore {
  saveSubscription(sub: SubscriptionRecord): Promise<void>;
}

export interface ConvertTrialDeps {
  readonly trialStore: ConvertTrialStore;
  readonly subscriptionStore: SubscriptionStore;
  readonly lifecycleStore: LifecycleStore;
  readonly clock: Clock;
  readonly logger: Logger;
}

export interface ConvertTrialInput {
  readonly trialId: string;
  readonly planId: string;
  readonly userId: UserId;
}

export interface ConvertTrialOutput {
  readonly trial: Trial;
  readonly subscription: SubscriptionRecord;
}

export type ConvertTrialError = TrialNotFoundError | TrialNotActiveError | Error;

function applyConversion(trial: Trial, planId: string, now: string): Trial {
  return {
    ...trial,
    status: "converted",
    planId,
    convertedAt: now as Trial["convertedAt"],
    updatedAt: now as Trial["updatedAt"],
  };
}

export async function convertTrialFlow(
  input: ConvertTrialInput,
  deps: ConvertTrialDeps,
): Promise<Result<ConvertTrialOutput, ConvertTrialError>> {
  const { trialStore, subscriptionStore, lifecycleStore, clock, logger } = deps;
  const now = clock.nowIso();

  const existing = await trialStore.findTrial(input.trialId);
  if (existing === null) {
    return err(new TrialNotFoundError(input.trialId as TrialId));
  }
  if (existing.status !== "active" && existing.status !== "extended") {
    return err(new TrialNotActiveError(input.trialId as TrialId, existing.status));
  }

  const convertedTrial = applyConversion(existing, input.planId, now);
  await trialStore.saveTrial(convertedTrial);
  logger.info("Trial converted", { trialId: input.trialId, userId: input.userId });

  const subscription: SubscriptionRecord = {
    id: newId("sub"),
    userId: input.userId,
    planId: input.planId,
    status: "active",
    startedAt: now,
    trialId: input.trialId,
  };
  await subscriptionStore.saveSubscription(subscription);

  const engine = createLifecycleEngine(lifecycleStore);
  const existingJourney = lifecycleStore.getJourneyBySubject("user", input.userId);
  if (existingJourney !== undefined) {
    engine.transition({
      journeyId: existingJourney.id,
      toStage: "active",
      trigger: "trial_converted",
    });
  } else {
    const journeyId = newId("journey");
    const journey = createJourney({
      id: journeyId,
      subject: { kind: "user", id: input.userId },
      initialStage: "active",
    });
    lifecycleStore.saveJourney(journey);
  }

  logger.info("Subscription created", { subscriptionId: subscription.id, userId: input.userId });
  return ok({ trial: convertedTrial, subscription });
}
