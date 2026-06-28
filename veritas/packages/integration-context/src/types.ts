// Shared primitive types used across the integration-context package.

import type { IsoTimestamp } from "@veritas/core";

/** Opaque string identifying a running flow execution. */
export type FlowRunId = string & { readonly __brand: "FlowRunId" };

/** Create a new FlowRunId from a plain string. */
export function asFlowRunId(value: string): FlowRunId {
  return value as FlowRunId;
}

/** Metadata attached to each flow run for observability. */
export interface FlowRunMeta {
  readonly runId: FlowRunId;
  readonly flowName: string;
  readonly startedAt: IsoTimestamp;
  readonly correlationId?: string;
  readonly userId?: string;
  readonly traceId?: string;
}

/** Generic key-value bag for passing ad-hoc context through a flow. */
export type FlowContext = Readonly<Record<string, unknown>>;

/** Describes the outcome of a completed flow step. */
export type StepStatus = "ok" | "err" | "skipped";

/** Lightweight record of a single step's execution. */
export interface StepRecord {
  readonly name: string;
  readonly status: StepStatus;
  readonly durationMs: number;
  readonly errorCode?: string;
}
