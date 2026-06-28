// Workflow worker: polls for tasks, executes workflows and activities with retry.
import type { Logger } from "@veritas/core";
import { noopLogger } from "@veritas/core";
import type { JsonValue, WorkerConfig, RetryPolicy, ActivityId } from "./types.js";
import {
  DEFAULT_WORKER_CONFIG,
  DEFAULT_RETRY_POLICY,
  newExecutionId,
} from "./types.js";
import type { WorkflowDefinition, ActivityDefinition } from "./builder.js";
import {
  InMemoryWorkflowContext,
  type ScheduleActivityOptions,
} from "./context.js";
import {
  ActivityFailedError,
  WorkerShutdownError,
  WorkflowNotFoundError,
} from "./errors.js";
import type { WorkflowId, ExecutionId } from "./types.js";

export interface WorkflowTask {
  readonly executionId: ExecutionId;
  readonly workflowId: WorkflowId;
  readonly input: JsonValue;
}

export interface ActivityTask {
  readonly activityId: ActivityId;
  readonly activityType: string;
  readonly input: JsonValue;
  readonly retryPolicy: RetryPolicy;
  readonly timeoutMs?: number;
}

export interface TaskQueue {
  enqueueWorkflow(task: WorkflowTask): Promise<void>;
  dequeueWorkflow(): Promise<WorkflowTask | undefined>;
  enqueueActivity(task: ActivityTask): Promise<void>;
  dequeueActivity(): Promise<ActivityTask | undefined>;
}

export class InMemoryTaskQueue implements TaskQueue {
  private readonly _workflows: WorkflowTask[] = [];
  private readonly _activities: ActivityTask[] = [];

  async enqueueWorkflow(task: WorkflowTask): Promise<void> {
    this._workflows.push(task);
  }

  async dequeueWorkflow(): Promise<WorkflowTask | undefined> {
    return this._workflows.shift();
  }

  async enqueueActivity(task: ActivityTask): Promise<void> {
    this._activities.push(task);
  }

  async dequeueActivity(): Promise<ActivityTask | undefined> {
    return this._activities.shift();
  }
}

async function runWithRetry<T>(
  fn: () => Promise<T>,
  policy: RetryPolicy,
  logger: Logger,
  label: string
): Promise<T> {
  let attempt = 0;
  while (true) {
    attempt += 1;
    try {
      return await fn();
    } catch (err: unknown) {
      if (attempt >= policy.maxAttempts) {
        throw err;
      }
      const delayMs = Math.min(
        policy.initialDelayMs * Math.pow(policy.backoffMultiplier, attempt - 1),
        policy.maxDelayMs
      );
      logger.warn(`${label} attempt ${attempt} failed, retrying in ${delayMs}ms`, {
        error: err instanceof Error ? err.message : String(err),
      });
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

export class WorkflowWorker {
  private _running = false;
  private _pollHandle: ReturnType<typeof setInterval> | undefined;
  private readonly _workflows = new Map<WorkflowId, WorkflowDefinition>();
  private readonly _config: WorkerConfig;
  private readonly _queue: TaskQueue;
  private readonly _logger: Logger;
  private _activeWorkflows = 0;

  constructor(opts: {
    queue?: TaskQueue;
    config?: Partial<WorkerConfig>;
    logger?: Logger;
  } = {}) {
    this._queue = opts.queue ?? new InMemoryTaskQueue();
    this._config = { ...DEFAULT_WORKER_CONFIG, ...(opts.config ?? {}) };
    this._logger = opts.logger ?? noopLogger;
  }

  registerWorkflow(definition: WorkflowDefinition): this {
    this._workflows.set(definition.workflowId, definition);
    return this;
  }

  getQueue(): TaskQueue {
    return this._queue;
  }

  start(): void {
    if (this._running) return;
    this._running = true;
    this._pollHandle = setInterval(
      () => void this._poll(),
      this._config.pollIntervalMs
    );
    this._logger.info("WorkflowWorker started", {
      taskQueue: this._config.taskQueue,
    });
  }

  async stop(): Promise<void> {
    this._running = false;
    if (this._pollHandle !== undefined) {
      clearInterval(this._pollHandle);
      this._pollHandle = undefined;
    }
    this._logger.info("WorkflowWorker stopped");
  }

  /** Directly execute a workflow by id with the given input. */
  async execute(workflowId: WorkflowId, input: JsonValue): Promise<JsonValue> {
    const definition = this._workflows.get(workflowId);
    if (definition === undefined) {
      throw new WorkflowNotFoundError(workflowId);
    }
    const executionId = newExecutionId();
    return this._runWorkflow(definition, executionId, input);
  }

  private async _poll(): Promise<void> {
    if (!this._running) return;
    if (this._activeWorkflows >= this._config.maxConcurrentWorkflows) return;

    const task = await this._queue.dequeueWorkflow();
    if (task === undefined) return;

    const definition = this._workflows.get(task.workflowId);
    if (definition === undefined) {
      this._logger.error("No workflow registered for id", {
        workflowId: task.workflowId,
      });
      return;
    }

    this._activeWorkflows += 1;
    this._runWorkflow(definition, task.executionId, task.input)
      .catch((err: unknown) => {
        this._logger.error("Workflow execution failed", {
          executionId: task.executionId,
          error: err instanceof Error ? err.message : String(err),
        });
      })
      .finally(() => {
        this._activeWorkflows -= 1;
      });
  }

  private async _runWorkflow(
    definition: WorkflowDefinition,
    executionId: ExecutionId,
    input: JsonValue
  ): Promise<JsonValue> {
    if (!this._running) throw new WorkerShutdownError();

    const ctx = new InMemoryWorkflowContext({
      workflowId: definition.workflowId,
      executionId,
      attempt: 1,
      isReplaying: false,
      activityRunner: (activityId, opts) =>
        this._runActivity(activityId, opts, definition),
    });

    this._logger.info("Starting workflow", {
      workflowId: definition.workflowId,
      executionId,
    });

    const result = await definition.fn(ctx, input);

    this._logger.info("Workflow completed", {
      workflowId: definition.workflowId,
      executionId,
    });

    return result;
  }

  private async _runActivity(
    activityId: ActivityId,
    opts: ScheduleActivityOptions,
    definition: WorkflowDefinition
  ): Promise<JsonValue> {
    const actDef: ActivityDefinition | undefined = definition.activities.get(
      opts.activityType
    );
    if (actDef === undefined) {
      throw new ActivityFailedError(
        activityId,
        new Error(`Unknown activity type: ${opts.activityType}`),
        0
      );
    }

    const policy: RetryPolicy = {
      ...DEFAULT_RETRY_POLICY,
      ...(opts.retryPolicy ?? {}),
    };

    let attempt = 0;
    try {
      return await runWithRetry(
        async () => {
          attempt += 1;
          return actDef.handler(opts.input) as Promise<JsonValue>;
        },
        policy,
        this._logger,
        `Activity[${opts.activityType}:${activityId}]`
      );
    } catch (err: unknown) {
      throw new ActivityFailedError(activityId, err, attempt);
    }
  }
}
