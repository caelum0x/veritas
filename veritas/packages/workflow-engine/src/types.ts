// Shared type definitions for the workflow engine.
import { z } from "zod";

export type WorkflowId = string & { readonly __brand: "WorkflowId" };
export type ActivityId = string & { readonly __brand: "ActivityId" };
export type ExecutionId = string & { readonly __brand: "ExecutionId" };
export type TimerId = string & { readonly __brand: "TimerId" };
export type SignalId = string & { readonly __brand: "SignalId" };

export function newWorkflowId(): WorkflowId {
  return `wf_${Date.now()}_${Math.random().toString(36).slice(2)}` as WorkflowId;
}

export function newExecutionId(): ExecutionId {
  return `ex_${Date.now()}_${Math.random().toString(36).slice(2)}` as ExecutionId;
}

export function newActivityId(): ActivityId {
  return `act_${Date.now()}_${Math.random().toString(36).slice(2)}` as ActivityId;
}

export function newTimerId(): TimerId {
  return `tmr_${Date.now()}_${Math.random().toString(36).slice(2)}` as TimerId;
}

export function newSignalId(): SignalId {
  return `sig_${Date.now()}_${Math.random().toString(36).slice(2)}` as SignalId;
}

export type WorkflowStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "compensating"
  | "compensated";

export type ActivityStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "retrying"
  | "skipped"
  | "compensated";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ])
);

export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly initialDelayMs: number;
  readonly maxDelayMs: number;
  readonly backoffMultiplier: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

export interface TimeoutPolicy {
  readonly scheduleToCloseMs?: number;
  readonly startToCloseMs?: number;
  readonly heartbeatMs?: number;
}

export interface WorkflowOptions {
  readonly retryPolicy?: Partial<RetryPolicy>;
  readonly timeoutPolicy?: TimeoutPolicy;
  readonly searchAttributes?: Record<string, string>;
  readonly memo?: Record<string, JsonValue>;
}

export interface ActivityOptions {
  readonly retryPolicy?: Partial<RetryPolicy>;
  readonly timeoutPolicy?: TimeoutPolicy;
  readonly activityType?: string;
}

export interface WorkerConfig {
  readonly taskQueue: string;
  readonly maxConcurrentActivities: number;
  readonly maxConcurrentWorkflows: number;
  readonly pollIntervalMs: number;
}

export const DEFAULT_WORKER_CONFIG: WorkerConfig = {
  taskQueue: "default",
  maxConcurrentActivities: 10,
  maxConcurrentWorkflows: 5,
  pollIntervalMs: 100,
};
