// Long-running workflow registration: wraps periodic workflow definitions for the engine.
import { type Result, ok, err } from "@veritas/core";
import type { WorkflowEngine, WorkflowDefinition } from "@veritas/workflow-engine";
import { newWorkflowId } from "@veritas/workflow-engine";
import type { Logger } from "@veritas/observability";
import { OrchestrationRegistry } from "./registry.js";
import { OrchestrationExecutionError } from "./errors.js";

export interface LongRunningDeps {
  readonly registry: OrchestrationRegistry;
  readonly engine: WorkflowEngine;
  readonly logger: Logger;
}

export interface LongRunningHandle {
  readonly name: string;
  readonly intervalMs: number;
  stop(): void;
}

/** Manages registration and periodic scheduling of long-running workflow definitions. */
export class LongRunningOrchestrator {
  private readonly _registry: OrchestrationRegistry;
  private readonly _engine: WorkflowEngine;
  private readonly _logger: Logger;
  private readonly _timers = new Map<string, ReturnType<typeof setInterval>>();

  constructor(deps: LongRunningDeps) {
    this._registry = deps.registry;
    this._engine = deps.engine;
    this._logger = deps.logger;
  }

  /**
   * Register a workflow as long-running with a given repeat interval.
   * The workflow is also added to the workflow engine for execution.
   */
  register(definition: WorkflowDefinition, intervalMs: number): Result<void> {
    try {
      this._registry.registerLongRunning(definition.type, definition, intervalMs);
      this._engine.registerWorkflow(definition);
      return ok(undefined);
    } catch (error) {
      return err(new OrchestrationExecutionError(definition.type, error));
    }
  }

  /**
   * Start periodic execution of a registered long-running workflow.
   * The workflow fires immediately and then repeats every intervalMs.
   */
  start(name: string, input: import("@veritas/workflow-engine").JsonValue): Result<LongRunningHandle> {
    const entry = this._registry.get(name);

    if (entry.kind !== "long-running") {
      return err(
        new OrchestrationExecutionError(
          name,
          new Error(`"${name}" is registered as "${entry.kind}", not long-running`)
        )
      );
    }

    const { intervalMs } = entry;
    const logger = this._logger;
    const engine = this._engine;

    const runOnce = async (): Promise<void> => {
      const workflowId = newWorkflowId();
      const result = await engine.startWorkflow({
        workflowId,
        type: name,
        input,
      });
      if (!result.ok) {
        logger.error("long-running: workflow start failed", {
          name,
          err: result.error,
        });
      } else {
        logger.info("long-running: workflow started", {
          name,
          executionId: result.value,
        });
      }
    };

    void runOnce();
    const timer = setInterval(() => { void runOnce(); }, intervalMs);
    this._timers.set(name, timer);

    const handle: LongRunningHandle = {
      name,
      intervalMs,
      stop: () => {
        clearInterval(timer);
        this._timers.delete(name);
        this._logger.info("long-running: stopped", { name });
      },
    };

    return ok(handle);
  }

  /** Stop all running long-running workflows. */
  stopAll(): void {
    for (const [name, timer] of this._timers) {
      clearInterval(timer);
      this._logger.info("long-running: stopped", { name });
    }
    this._timers.clear();
  }
}
