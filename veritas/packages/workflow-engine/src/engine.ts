// Workflow execution engine: schedules, runs, and tracks workflow executions.
import { tryAsync, type Result } from "@veritas/core";
import type { JsonValue, WorkflowId, ExecutionId, ActivityId } from "./types.js";
import { newExecutionId, newWorkflowId, DEFAULT_RETRY_POLICY } from "./types.js";
import type { WorkflowDefinition } from "./workflow.js";
import { WorkflowRegistry } from "./workflow.js";
import type { ActivityDefinition } from "./activity.js";
import { ActivityRegistry, executeActivityWithRetry } from "./activity.js";
import {
  createInitialWorkflowState,
  transitionToRunning,
  transitionToCompleted,
  transitionToFailed,
  transitionToCancelled,
  isTerminalState,
  type WorkflowState,
} from "./state.js";
import { MutableWorkflowHistory } from "./history.js";
import { InMemoryWorkflowContext } from "./context.js";
import type { ScheduleActivityOptions } from "./context.js";
import { createInMemoryWorkflowStore, type WorkflowStore } from "./store.js";
import { WorkflowNotFoundError, WorkflowInvalidStateError } from "./errors.js";

export interface StartWorkflowOptions {
  readonly workflowId?: WorkflowId;
  readonly type: string;
  readonly version?: number;
  readonly input: JsonValue;
  readonly taskQueue?: string;
}

/** In-memory map of execution states (not persisted to WorkflowStore). */
const _states = new Map<ExecutionId, WorkflowState>();
const _contexts = new Map<ExecutionId, InMemoryWorkflowContext>();

export interface WorkflowEngine {
  registerWorkflow(definition: WorkflowDefinition): void;
  registerActivity(definition: ActivityDefinition): void;
  startWorkflow(opts: StartWorkflowOptions): Promise<Result<ExecutionId>>;
  getExecutionState(executionId: ExecutionId): WorkflowState | null;
  cancelWorkflow(executionId: ExecutionId, reason: string): Promise<Result<void>>;
  deliverSignal(
    executionId: ExecutionId,
    signalName: string,
    payload: JsonValue
  ): Promise<Result<void>>;
}

export class InMemoryWorkflowEngine implements WorkflowEngine {
  private readonly _workflows = new WorkflowRegistry();
  private readonly _activities = new ActivityRegistry();
  private readonly _store: WorkflowStore;
  private readonly _states = new Map<ExecutionId, WorkflowState>();
  private readonly _contexts = new Map<ExecutionId, InMemoryWorkflowContext>();

  constructor(store?: WorkflowStore) {
    this._store = store ?? createInMemoryWorkflowStore();
  }

  registerWorkflow(definition: WorkflowDefinition): void {
    this._workflows.register(definition);
  }

  registerActivity(definition: ActivityDefinition): void {
    this._activities.register(definition);
  }

  async startWorkflow(opts: StartWorkflowOptions): Promise<Result<ExecutionId>> {
    const definition = this._workflows.resolve(opts.type, opts.version);
    if (definition === undefined) {
      return { ok: false, error: new WorkflowNotFoundError(opts.type as WorkflowId) };
    }

    const workflowId = opts.workflowId ?? (newWorkflowId());
    const executionId = newExecutionId();

    const workflowRecord = await this._store.createWorkflow(opts.type, opts.input);
    await this._store.createExecution(workflowRecord.workflowId, 1);

    const state = transitionToRunning(
      createInitialWorkflowState({
        workflowId,
        executionId,
        input: opts.input,
      })
    );
    this._states.set(executionId, state);

    void this._runWorkflow(executionId, workflowRecord.workflowId, definition, opts.input);

    return { ok: true, value: executionId };
  }

  private async _runWorkflow(
    executionId: ExecutionId,
    workflowId: WorkflowId,
    definition: WorkflowDefinition,
    input: JsonValue
  ): Promise<void> {
    const context = new InMemoryWorkflowContext({
      workflowId,
      executionId,
      attempt: 1,
      isReplaying: false,
      activityRunner: (actId: ActivityId, opts: ScheduleActivityOptions) =>
        this._runActivity(actId, opts, executionId),
    });
    this._contexts.set(executionId, context);

    const result = await tryAsync(() => definition.execute(input, context));
    this._contexts.delete(executionId);

    const current = this._states.get(executionId);
    if (current === undefined || isTerminalState(current)) return;

    if (result.ok) {
      const completed = transitionToCompleted(current, result.value);
      this._states.set(executionId, completed);
      await this._store.updateWorkflow(workflowId, {
        status: "completed",
        output: result.value,
        completedAt: new Date().toISOString(),
      });
    } else {
      const errMsg =
        result.error instanceof Error ? result.error.message : String(result.error);
      const failed = transitionToFailed(current, errMsg);
      this._states.set(executionId, failed);
      await this._store.updateWorkflow(workflowId, {
        status: "failed",
        error: errMsg,
        completedAt: new Date().toISOString(),
      });
    }
  }

  private async _runActivity(
    activityId: ActivityId,
    opts: ScheduleActivityOptions,
    executionId: ExecutionId
  ): Promise<JsonValue> {
    const definition = this._activities.resolve(opts.activityType);
    if (definition === undefined) {
      throw new Error(`Activity type not registered: ${opts.activityType}`);
    }

    const policy = { ...DEFAULT_RETRY_POLICY, ...(opts.retryPolicy ?? {}) };
    const result = await executeActivityWithRetry(
      definition,
      opts.input,
      {
        activityId,
        workflowId: executionId,
        executionId,
        heartbeat: () => { /* no-op for in-memory */ },
      },
      policy
    );

    if (!result.ok) throw result.error;
    return result.value;
  }

  getExecutionState(executionId: ExecutionId): WorkflowState | null {
    return this._states.get(executionId) ?? null;
  }

  async cancelWorkflow(
    executionId: ExecutionId,
    _reason: string
  ): Promise<Result<void>> {
    const state = this._states.get(executionId);
    if (state === undefined) {
      return { ok: false, error: new WorkflowNotFoundError(executionId) };
    }
    if (isTerminalState(state)) {
      return {
        ok: false,
        error: new WorkflowInvalidStateError(executionId, state.status, "running"),
      };
    }
    this._states.set(executionId, transitionToCancelled(state));
    return { ok: true, value: undefined };
  }

  async deliverSignal(
    executionId: ExecutionId,
    signalName: string,
    payload: JsonValue
  ): Promise<Result<void>> {
    const ctx = this._contexts.get(executionId);
    if (ctx === undefined) {
      return { ok: false, error: new WorkflowNotFoundError(executionId) };
    }
    ctx.deliverSignal(signalName, payload);
    return { ok: true, value: undefined };
  }
}
