// Immutable workflow execution state with pure transition functions.
import type {
  WorkflowId,
  ExecutionId,
  ActivityId,
  JsonValue,
  WorkflowStatus,
  ActivityStatus,
  RetryPolicy,
} from "./types.js";

export interface ActivityState {
  readonly activityId: ActivityId;
  readonly activityType: string;
  readonly status: ActivityStatus;
  readonly input: JsonValue;
  readonly output: JsonValue | null;
  readonly error: string | null;
  readonly attempts: number;
  readonly scheduledAt: number;
  readonly startedAt: number | null;
  readonly completedAt: number | null;
  readonly retryPolicy: RetryPolicy;
}

export interface WorkflowState {
  readonly workflowId: WorkflowId;
  readonly executionId: ExecutionId;
  readonly status: WorkflowStatus;
  readonly input: JsonValue;
  readonly output: JsonValue | null;
  readonly error: string | null;
  readonly activities: ReadonlyMap<ActivityId, ActivityState>;
  readonly createdAt: number;
  readonly startedAt: number | null;
  readonly completedAt: number | null;
}

export function createInitialWorkflowState(params: {
  workflowId: WorkflowId;
  executionId: ExecutionId;
  input: JsonValue;
}): WorkflowState {
  return {
    workflowId: params.workflowId,
    executionId: params.executionId,
    status: "pending",
    input: params.input,
    output: null,
    error: null,
    activities: new Map(),
    createdAt: Date.now(),
    startedAt: null,
    completedAt: null,
  };
}

export function transitionToRunning(state: WorkflowState): WorkflowState {
  return { ...state, status: "running", startedAt: Date.now() };
}

export function transitionToCompleted(
  state: WorkflowState,
  output: JsonValue
): WorkflowState {
  return { ...state, status: "completed", output, completedAt: Date.now() };
}

export function transitionToFailed(
  state: WorkflowState,
  error: string
): WorkflowState {
  return { ...state, status: "failed", error, completedAt: Date.now() };
}

export function transitionToCancelled(state: WorkflowState): WorkflowState {
  return { ...state, status: "cancelled", completedAt: Date.now() };
}

export function transitionToCompensating(state: WorkflowState): WorkflowState {
  return { ...state, status: "compensating" };
}

export function transitionToCompensated(state: WorkflowState): WorkflowState {
  return { ...state, status: "compensated", completedAt: Date.now() };
}

export function scheduleActivity(
  state: WorkflowState,
  activity: ActivityState
): WorkflowState {
  const activities = new Map(state.activities);
  activities.set(activity.activityId, activity);
  return { ...state, activities };
}

export function updateActivityState(
  state: WorkflowState,
  activityId: ActivityId,
  patch: Partial<ActivityState>
): WorkflowState {
  const existing = state.activities.get(activityId);
  if (existing === undefined) return state;
  const activities = new Map(state.activities);
  activities.set(activityId, { ...existing, ...patch });
  return { ...state, activities };
}

export function isTerminalState(state: WorkflowState): boolean {
  return (
    state.status === "completed" ||
    state.status === "failed" ||
    state.status === "cancelled" ||
    state.status === "compensated"
  );
}
