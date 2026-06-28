// Bridge between the orchestration registry and durable timer scheduling.
import { type Result, ok, err } from "@veritas/core";
import type { WorkflowEngine, JsonValue, TimerStore, DurableTimer } from "@veritas/workflow-engine";
import { newWorkflowId, newExecutionId, sleepUntil, tickTimers } from "@veritas/workflow-engine";
import type { SagaStorePort } from "@veritas/sagas";
import { SagaOrchestrator } from "@veritas/sagas";
import type { Logger } from "@veritas/observability";
import { OrchestrationRegistry } from "./registry.js";
import type { ScheduleDescriptor } from "./types.js";
import { OrchestrationScheduleError, OrchestrationExecutionError } from "./errors.js";

export interface SchedulerBridgeDeps {
  readonly registry: OrchestrationRegistry;
  readonly engine: WorkflowEngine;
  readonly timerStore: TimerStore;
  readonly sagaStore: SagaStorePort;
  readonly logger: Logger;
  readonly now?: () => number;
}

/** Bridges orchestration scheduling to durable timers and the workflow engine. */
export class SchedulerBridge {
  private readonly _registry: OrchestrationRegistry;
  private readonly _engine: WorkflowEngine;
  private readonly _timerStore: TimerStore;
  private readonly _sagaOrchestrator: SagaOrchestrator;
  private readonly _logger: Logger;
  private readonly _pending = new Map<string, ScheduleDescriptor>();

  constructor(deps: SchedulerBridgeDeps) {
    this._registry = deps.registry;
    this._engine = deps.engine;
    this._timerStore = deps.timerStore;
    this._logger = deps.logger;
    this._sagaOrchestrator = new SagaOrchestrator({
      store: deps.sagaStore,
      logger: deps.logger,
      now: deps.now,
    });
  }

  /**
   * Schedule an orchestration (saga or workflow) to run at a future time.
   * Returns the DurableTimer that was created.
   */
  async schedule(descriptor: ScheduleDescriptor): Promise<Result<DurableTimer>> {
    if (!this._registry.has(descriptor.name)) {
      return err(
        new OrchestrationScheduleError(
          descriptor.name,
          "orchestration not registered"
        )
      );
    }

    const workflowId = newWorkflowId();
    const fireAt = new Date(descriptor.runAtMs);

    try {
      const executionId = newExecutionId();
      const timer = await sleepUntil(
        this._timerStore,
        workflowId,
        executionId,
        fireAt,
        descriptor.name
      );
      this._pending.set(timer.timerId, descriptor);
      this._logger.info("scheduler-bridge: scheduled", {
        name: descriptor.name,
        timerId: timer.timerId,
        fireAt: fireAt.toISOString(),
      });
      return ok(timer);
    } catch (error) {
      return err(new OrchestrationScheduleError(descriptor.name, String(error)));
    }
  }

  /**
   * Tick the timer store, fire any due timers, and launch their orchestrations.
   * Call periodically from a cron or event loop.
   */
  async tick(): Promise<Result<readonly string[]>> {
    let fired: readonly DurableTimer[];
    try {
      fired = await tickTimers(this._timerStore);
    } catch (error) {
      return err(new OrchestrationExecutionError("tick", error));
    }

    const launched: string[] = [];

    for (const timer of fired) {
      const descriptor = this._pending.get(timer.timerId);
      if (descriptor === undefined) continue;

      this._pending.delete(timer.timerId);
      const entry = this._registry.get(descriptor.name);

      if (entry.kind === "saga") {
        const sagaId = `${descriptor.name}_${timer.timerId}`;
        void this._sagaOrchestrator
          .run(entry.saga, sagaId, descriptor.input)
          .then((result) => {
            if (!result.ok) {
              this._logger.error("scheduler-bridge: saga failed", {
                name: descriptor.name,
                sagaId,
                err: result.error,
              });
            } else {
              this._logger.info("scheduler-bridge: saga completed", {
                name: descriptor.name,
                sagaId,
              });
            }
          });
        launched.push(sagaId);
      } else if (entry.kind === "workflow" || entry.kind === "long-running") {
        const workflowId = newWorkflowId();
        void this._engine
          .startWorkflow({
            workflowId,
            type: entry.name,
            input: descriptor.input as JsonValue,
          })
          .then((result) => {
            if (!result.ok) {
              this._logger.error("scheduler-bridge: workflow start failed", {
                name: entry.name,
                err: result.error,
              });
            }
          });
        launched.push(workflowId);
      }

      if (descriptor.recurrenceMs !== undefined) {
        const next: ScheduleDescriptor = {
          ...descriptor,
          runAtMs: descriptor.runAtMs + descriptor.recurrenceMs,
        };
        void this.schedule(next);
      }
    }

    return ok(launched);
  }
}
