// Saga-style compensation (rollback) for completed workflow activities.
import type { WorkflowId, ExecutionId, ActivityId, JsonValue } from "./types.js";

export type CompensationStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export interface CompensationStep {
  readonly activityId: ActivityId;
  readonly activityName: string;
  readonly activityOutput: JsonValue;
  readonly handler: CompensationHandler;
  readonly retryPolicy: CompensationRetryPolicy;
}

export interface CompensationRecord {
  readonly activityId: ActivityId;
  readonly activityName: string;
  readonly status: CompensationStatus;
  readonly startedAt: string | undefined;
  readonly completedAt: string | undefined;
  readonly error: string | undefined;
  readonly attempts: number;
}

export interface CompensationRetryPolicy {
  readonly maxAttempts: number;
  readonly delayMs: number;
}

export const DEFAULT_COMPENSATION_RETRY: CompensationRetryPolicy = {
  maxAttempts: 3,
  delayMs: 500,
};

export type CompensationHandler = (
  workflowId: WorkflowId,
  activityOutput: JsonValue
) => Promise<void>;

export interface CompensationPlan {
  readonly workflowId: WorkflowId;
  readonly executionId: ExecutionId;
  /** Steps are run in reverse order (LIFO). */
  readonly steps: readonly CompensationStep[];
}

export interface CompensationResult {
  readonly workflowId: WorkflowId;
  readonly executionId: ExecutionId;
  readonly records: readonly CompensationRecord[];
  readonly succeeded: boolean;
}

/** Executes all compensation steps in reverse (LIFO) order. */
export async function runCompensation(
  plan: CompensationPlan,
  onRecord?: (record: CompensationRecord) => void
): Promise<CompensationResult> {
  const records: CompensationRecord[] = [];
  const reversed = [...plan.steps].reverse();

  for (const step of reversed) {
    const record = await compensateStep(plan.workflowId, step);
    records.push(record);
    onRecord?.(record);
  }

  const succeeded = records.every(
    (r) => r.status === "completed" || r.status === "skipped"
  );

  return {
    workflowId: plan.workflowId,
    executionId: plan.executionId,
    records,
    succeeded,
  };
}

async function compensateStep(
  workflowId: WorkflowId,
  step: CompensationStep
): Promise<CompensationRecord> {
  const { maxAttempts, delayMs } = step.retryPolicy;
  let attempts = 0;
  let lastError: unknown;

  while (attempts < maxAttempts) {
    attempts += 1;
    try {
      await step.handler(workflowId, step.activityOutput);
      return {
        activityId: step.activityId,
        activityName: step.activityName,
        status: "completed",
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        error: undefined,
        attempts,
      };
    } catch (err) {
      lastError = err;
      if (attempts < maxAttempts) {
        await new Promise<void>((res) => setTimeout(res, delayMs));
      }
    }
  }

  return {
    activityId: step.activityId,
    activityName: step.activityName,
    status: "failed",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    error: lastError instanceof Error ? lastError.message : String(lastError),
    attempts,
  };
}

/** Builds an empty compensation plan for the given workflow execution. */
export function createCompensationPlan(
  workflowId: WorkflowId,
  executionId: ExecutionId
): CompensationPlan {
  return { workflowId, executionId, steps: [] };
}

/** Returns a new plan with an additional compensation step appended. */
export function appendCompensationStep(
  plan: CompensationPlan,
  step: CompensationStep
): CompensationPlan {
  return { ...plan, steps: [...plan.steps, step] };
}
