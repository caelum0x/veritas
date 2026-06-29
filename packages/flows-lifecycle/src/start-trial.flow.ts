// Flow: check trial eligibility, create trial record, then kick off onboarding.
import { ok, err, type Result, type UserId, type Clock, newId } from "@veritas/core";
import {
  type Trial,
  type CreateTrialParams,
  newTrialId,
  TrialAlreadyActiveError,
} from "@veritas/trials";
import {
  makeFlow,
  startFlow,
  type OnboardingFlow,
  makeStep,
  addStepToFlow,
} from "@veritas/onboarding";
import {
  createLifecycleEngine,
  createJourney,
  type LifecycleStore,
} from "@veritas/lifecycle";
import { type Logger } from "@veritas/observability";

export interface TrialStore {
  findActiveTrialByUser(userId: UserId): Promise<Trial | null>;
  saveTrial(trial: Trial): Promise<void>;
}

export interface OnboardingStore {
  saveFlow(flow: OnboardingFlow): Promise<void>;
}

export interface StartTrialDeps {
  readonly trialStore: TrialStore;
  readonly onboardingStore: OnboardingStore;
  readonly lifecycleStore: LifecycleStore;
  readonly clock: Clock;
  readonly logger: Logger;
}

export interface StartTrialInput {
  readonly userId: UserId;
  readonly planId: string;
  readonly durationDays: number;
  readonly organizationId?: string | null;
  readonly metadata?: Record<string, string>;
}

export interface StartTrialOutput {
  readonly trial: Trial;
  readonly onboardingFlow: OnboardingFlow;
}

export type StartTrialError = TrialAlreadyActiveError | Error;

function buildTrial(input: StartTrialInput, now: string, clock: Clock): Trial {
  const startsAt = now;
  const expiresAt = new Date(
    clock.now() + input.durationDays * 24 * 60 * 60 * 1000,
  ).toISOString() as typeof now;
  return {
    id: newTrialId(),
    userId: input.userId,
    planId: input.planId,
    status: "active",
    startsAt: startsAt as Trial["startsAt"],
    expiresAt: expiresAt as Trial["expiresAt"],
    extendedAt: null,
    convertedAt: null,
    cancelledAt: null,
    extensionCount: 0,
    remindersSent: [],
    metadata: input.metadata ?? {},
    createdAt: startsAt as Trial["createdAt"],
    updatedAt: startsAt as Trial["updatedAt"],
  };
}

function buildOnboardingFlow(
  input: StartTrialInput,
  now: string,
): OnboardingFlow {
  const base = makeFlow(
    {
      userId: input.userId as string,
      organizationId: input.organizationId ?? null,
      templateId: null,
      name: "Trial Onboarding",
      description: "Complete these steps to get started with your trial.",
      metadata: {},
    },
    now,
  );
  const started = startFlow(base, now);

  const steps = (
    [
      { kind: "profile_setup" as const, title: "Set up your profile", order: 0 },
      { kind: "first_claim" as const, title: "Submit your first claim", order: 1 },
      { kind: "first_verification" as const, title: "Run your first verification", order: 2 },
    ] as const
  ).map(({ kind, title, order }) =>
    makeStep({
      flowId: started.id,
      kind,
      title,
      description: "",
      order,
      required: true,
      skippable: false,
      metadata: {},
    }),
  );

  return steps.reduce((flow, step) => addStepToFlow(flow, step, now), started);
}

export async function startTrialFlow(
  input: StartTrialInput,
  deps: StartTrialDeps,
): Promise<Result<StartTrialOutput, StartTrialError>> {
  const { trialStore, onboardingStore, lifecycleStore, clock, logger } = deps;
  const now = clock.nowIso();

  const existing = await trialStore.findActiveTrialByUser(input.userId);
  if (existing !== null) {
    return err(new TrialAlreadyActiveError(input.userId));
  }

  const trial = buildTrial(input, now, clock);
  await trialStore.saveTrial(trial);
  logger.info("Trial started", { userId: input.userId, trialId: trial.id });

  const engine = createLifecycleEngine(lifecycleStore);
  const journeyId = newId("journey");
  const journey = createJourney({
    id: journeyId,
    subject: { kind: "user", id: input.userId },
    initialStage: "prospect",
  });
  lifecycleStore.saveJourney(journey);
  engine.transition({
    journeyId,
    toStage: "trial",
    trigger: "trial_started",
  });

  const onboardingFlow = buildOnboardingFlow(input, now);
  await onboardingStore.saveFlow(onboardingFlow);
  logger.info("Onboarding flow created", { flowId: onboardingFlow.id, userId: input.userId });

  return ok({ trial, onboardingFlow });
}
