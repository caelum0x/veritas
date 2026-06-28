// Lifecycle engine — orchestrates stage transitions, trigger dispatch, and event emission.
import { ok, err, type Result } from "@veritas/core";
import {
  type LifecycleStage,
  isFinalStage,
  getStageConfig,
} from "./stage.js";
import {
  isTransitionAllowed,
  getTransition,
} from "./transition.js";
import {
  type TriggerType,
  type TriggerContext,
  getTrigger,
  resolveTriggerTarget,
} from "./trigger.js";
import {
  type LifecycleEvent,
  makeStageEnteredEvent,
  makeStageExitedEvent,
  makeTransitionCompletedEvent,
  makeTransitionRejectedEvent,
  makeTriggerFiredEvent,
} from "./event.js";
import {
  type LifecycleJourney,
  advanceJourney,
} from "./journey.js";
import { type LifecycleStore } from "./store.js";
import {
  JourneyNotFoundError,
  InvalidTransitionError,
  TransitionDeniedError,
  JourneyAlreadyTerminatedError,
} from "./errors.js";

export type EngineError =
  | JourneyNotFoundError
  | InvalidTransitionError
  | TransitionDeniedError
  | JourneyAlreadyTerminatedError;

export interface TransitionRequest {
  readonly journeyId: string;
  readonly toStage: LifecycleStage;
  readonly trigger: TriggerType;
  readonly actorId?: string | null;
  readonly metadata?: Record<string, unknown>;
}

export interface TransitionResult {
  readonly journey: LifecycleJourney;
  readonly events: ReadonlyArray<LifecycleEvent>;
}

export interface TriggerRequest {
  readonly journeyId: string;
  readonly trigger: TriggerType;
  readonly overrideStage?: LifecycleStage;
  readonly context?: Partial<TriggerContext>;
}

export interface LifecycleEngine {
  transition(request: TransitionRequest): Result<TransitionResult, EngineError>;
  fire(request: TriggerRequest): Result<TransitionResult, EngineError>;
  getJourney(journeyId: string): Result<LifecycleJourney, JourneyNotFoundError>;
  listJourneys(): ReadonlyArray<LifecycleJourney>;
}

export function createLifecycleEngine(store: LifecycleStore): LifecycleEngine {
  function getJourney(journeyId: string): Result<LifecycleJourney, JourneyNotFoundError> {
    const journey = store.getJourney(journeyId);
    if (journey === undefined) {
      return err(new JourneyNotFoundError(journeyId));
    }
    return ok(journey);
  }

  function transition(
    request: TransitionRequest,
  ): Result<TransitionResult, EngineError> {
    const journeyResult = getJourney(request.journeyId);
    if (!journeyResult.ok) return journeyResult;

    const journey = journeyResult.value;
    const fromStage = journey.currentStage;
    const toStage = request.toStage;
    const entityId = journey.subject.id;
    const entityType = journey.subject.kind;
    const actorId = request.actorId ?? null;

    if (journey.status === "terminated") {
      return err(new JourneyAlreadyTerminatedError(journey.id, fromStage));
    }

    if (!isTransitionAllowed(fromStage, toStage)) {
      const rejectedEvent = makeTransitionRejectedEvent(
        entityId,
        entityType,
        fromStage,
        toStage,
        `No allowed transition from '${fromStage}' to '${toStage}'`,
        actorId,
      );
      return err(new InvalidTransitionError(fromStage, toStage));
    }

    const transitionDef = getTransition(fromStage, toStage);
    if (transitionDef?.requiresApproval && actorId === null) {
      return err(
        new TransitionDeniedError(fromStage, toStage, "Transition requires explicit actor approval"),
      );
    }

    const exitedEvent = makeStageExitedEvent(entityId, entityType, fromStage, toStage);
    const updatedJourney = advanceJourney(journey, {
      toStage,
      trigger: request.trigger,
      actorId,
      metadata: request.metadata,
    });
    const enteredEvent = makeStageEnteredEvent(entityId, entityType, toStage, fromStage);
    const completedEvent = makeTransitionCompletedEvent(
      entityId,
      entityType,
      fromStage,
      toStage,
      request.trigger,
      actorId,
    );

    store.saveJourney(updatedJourney);

    return ok({
      journey: updatedJourney,
      events: [exitedEvent, enteredEvent, completedEvent],
    });
  }

  function fire(request: TriggerRequest): Result<TransitionResult, EngineError> {
    const journeyResult = getJourney(request.journeyId);
    if (!journeyResult.ok) return journeyResult;

    const journey = journeyResult.value;
    const triggerDef = getTrigger(request.trigger);
    const targetStage = resolveTriggerTarget(request.trigger, request.overrideStage);
    const entityId = journey.subject.id;
    const entityType = journey.subject.kind;
    const metadata = request.context?.metadata ?? {};

    const triggerFiredEvent = makeTriggerFiredEvent(entityId, entityType, request.trigger, metadata);

    const transitionResult = transition({
      journeyId: request.journeyId,
      toStage: targetStage,
      trigger: request.trigger,
      actorId: request.context?.entityId ?? null,
      metadata,
    });

    if (!transitionResult.ok) return transitionResult;

    return ok({
      journey: transitionResult.value.journey,
      events: [triggerFiredEvent, ...transitionResult.value.events],
    });
  }

  function listJourneys(): ReadonlyArray<LifecycleJourney> {
    return store.listJourneys();
  }

  return { transition, fire, getJourney, listJourneys };
}
