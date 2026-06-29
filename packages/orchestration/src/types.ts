// Core type definitions for the orchestration layer: entries, handles, and configs.
import type { Result } from "@veritas/core";
import type { Saga } from "@veritas/sagas";
import type { WorkflowDefinition, WorkflowEngine } from "@veritas/workflow-engine";
import type { Logger } from "@veritas/observability";

/** Kind discriminant for registered orchestration entries. */
export type OrchestrationKind = "saga" | "workflow" | "long-running";

/** An entry holding a saga definition alongside metadata. */
export interface SagaEntry {
  readonly kind: "saga";
  readonly name: string;
  readonly saga: Saga<unknown, unknown>;
}

/** An entry holding a workflow definition alongside metadata. */
export interface WorkflowEntry {
  readonly kind: "workflow";
  readonly name: string;
  readonly definition: WorkflowDefinition;
}

/** An entry for a long-running orchestration (workflow with periodic activity). */
export interface LongRunningEntry {
  readonly kind: "long-running";
  readonly name: string;
  readonly definition: WorkflowDefinition;
  readonly intervalMs: number;
}

/** Union of all registered orchestration entry types. */
export type OrchestrationEntry = SagaEntry | WorkflowEntry | LongRunningEntry;

/** Handle returned after launching an orchestration; used to await or cancel. */
export interface OrchestrationHandle<TOutput = unknown> {
  readonly id: string;
  readonly name: string;
  waitForResult(): Promise<Result<TOutput>>;
  cancel(reason?: string): Promise<void>;
}

/** Configuration passed when building the orchestration container. */
export interface OrchestrationConfig {
  readonly engine: WorkflowEngine;
  readonly logger?: Logger;
  readonly maxConcurrency?: number;
}

/** Schedule descriptor for deferred or recurring orchestrations. */
export interface ScheduleDescriptor {
  readonly name: string;
  readonly input: unknown;
  readonly runAtMs: number;
  readonly recurrenceMs?: number;
}
