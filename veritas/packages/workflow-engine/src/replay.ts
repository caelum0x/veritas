// Deterministic replay of workflow execution from event history.
import type { WorkflowId, ExecutionId, JsonValue } from "./types.js";

export type HistoryEventType =
  | "WORKFLOW_STARTED"
  | "ACTIVITY_SCHEDULED"
  | "ACTIVITY_STARTED"
  | "ACTIVITY_COMPLETED"
  | "ACTIVITY_FAILED"
  | "TIMER_FIRED"
  | "SIGNAL_RECEIVED"
  | "WORKFLOW_COMPLETED"
  | "WORKFLOW_FAILED"
  | "COMPENSATION_STARTED"
  | "COMPENSATION_COMPLETED";

export interface HistoryEvent {
  readonly eventId: number;
  readonly eventType: HistoryEventType;
  readonly timestamp: string;
  readonly workflowId: WorkflowId;
  readonly executionId: ExecutionId;
  readonly payload: JsonValue;
}

export interface ReplayResult {
  readonly isReplaying: boolean;
  readonly replayIndex: number;
  readonly totalEvents: number;
}

export interface ReplayContext {
  readonly workflowId: WorkflowId;
  readonly executionId: ExecutionId;
  readonly history: readonly HistoryEvent[];
  readonly currentIndex: number;
}

export interface ReplayDecision {
  readonly shouldExecute: boolean;
  readonly cachedResult: JsonValue | undefined;
  readonly nextIndex: number;
}

/** Determines whether a step should execute or use a cached history result. */
export function decideReplay(
  ctx: ReplayContext,
  eventType: HistoryEventType
): ReplayDecision {
  const { history, currentIndex } = ctx;

  if (currentIndex >= history.length) {
    return { shouldExecute: true, cachedResult: undefined, nextIndex: currentIndex };
  }

  const event = history[currentIndex];
  if (event === undefined || event.eventType !== eventType) {
    return { shouldExecute: true, cachedResult: undefined, nextIndex: currentIndex };
  }

  return {
    shouldExecute: false,
    cachedResult: event.payload,
    nextIndex: currentIndex + 1,
  };
}

/** Checks whether execution is currently in replay mode (behind history). */
export function isReplaying(ctx: ReplayContext): boolean {
  return ctx.currentIndex < ctx.history.length;
}

/** Builds a replay result summary from context. */
export function makeReplayResult(ctx: ReplayContext): ReplayResult {
  return {
    isReplaying: isReplaying(ctx),
    replayIndex: ctx.currentIndex,
    totalEvents: ctx.history.length,
  };
}

/** Creates an initial replay context for a new execution run. */
export function createReplayContext(
  workflowId: WorkflowId,
  executionId: ExecutionId,
  history: readonly HistoryEvent[]
): ReplayContext {
  return { workflowId, executionId, history, currentIndex: 0 };
}

/** Advances the replay context index by one step. */
export function advanceReplayContext(ctx: ReplayContext): ReplayContext {
  return { ...ctx, currentIndex: ctx.currentIndex + 1 };
}

/** Filters history events by type for inspection or debugging. */
export function filterHistoryByType(
  history: readonly HistoryEvent[],
  eventType: HistoryEventType
): readonly HistoryEvent[] {
  return history.filter((e) => e.eventType === eventType);
}
