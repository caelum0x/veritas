// Workflow execution context passed to workflow and activity functions.
import type { JsonValue, ActivityId, TimerId, SignalId } from "./types.js";
import type { WorkflowId, ExecutionId } from "./types.js";
import { newActivityId, newTimerId, newSignalId } from "./types.js";

export interface ScheduleActivityOptions {
  readonly activityType: string;
  readonly input: JsonValue;
  readonly retryPolicy?: {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
  };
  readonly timeoutMs?: number;
}

export interface TimerOptions {
  readonly delayMs: number;
}

export interface WorkflowContext {
  readonly workflowId: WorkflowId;
  readonly executionId: ExecutionId;
  readonly attempt: number;
  readonly isReplaying: boolean;
  scheduleActivity(opts: ScheduleActivityOptions): Promise<JsonValue>;
  startTimer(opts: TimerOptions): Promise<void>;
  waitForSignal(signalName: string, timeoutMs?: number): Promise<JsonValue>;
  continueAsNew(input: JsonValue): Promise<never>;
}

export type SignalHandler = (payload: JsonValue) => void;

export class InMemoryWorkflowContext implements WorkflowContext {
  readonly workflowId: WorkflowId;
  readonly executionId: ExecutionId;
  readonly attempt: number;
  isReplaying: boolean;

  private readonly _activityRunner: (
    activityId: ActivityId,
    opts: ScheduleActivityOptions
  ) => Promise<JsonValue>;

  private readonly _signalHandlers = new Map<string, SignalHandler>();
  private readonly _pendingSignals = new Map<string, JsonValue[]>();

  constructor(params: {
    workflowId: WorkflowId;
    executionId: ExecutionId;
    attempt: number;
    isReplaying: boolean;
    activityRunner: (
      activityId: ActivityId,
      opts: ScheduleActivityOptions
    ) => Promise<JsonValue>;
  }) {
    this.workflowId = params.workflowId;
    this.executionId = params.executionId;
    this.attempt = params.attempt;
    this.isReplaying = params.isReplaying;
    this._activityRunner = params.activityRunner;
  }

  async scheduleActivity(opts: ScheduleActivityOptions): Promise<JsonValue> {
    const activityId = newActivityId();
    return this._activityRunner(activityId, opts);
  }

  async startTimer(opts: TimerOptions): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, opts.delayMs));
  }

  async waitForSignal(signalName: string, timeoutMs = 30000): Promise<JsonValue> {
    const pending = this._pendingSignals.get(signalName);
    if (pending !== undefined && pending.length > 0) {
      const [first, ...rest] = pending;
      this._pendingSignals.set(signalName, rest);
      return first as JsonValue;
    }

    return new Promise<JsonValue>((resolve, reject) => {
      const timer = setTimeout(() => {
        this._signalHandlers.delete(signalName);
        reject(new Error(`Signal ${signalName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this._signalHandlers.set(signalName, (payload) => {
        clearTimeout(timer);
        this._signalHandlers.delete(signalName);
        resolve(payload);
      });
    });
  }

  deliverSignal(signalName: string, payload: JsonValue): void {
    const handler = this._signalHandlers.get(signalName);
    if (handler !== undefined) {
      handler(payload);
    } else {
      const existing = this._pendingSignals.get(signalName) ?? [];
      this._pendingSignals.set(signalName, [...existing, payload]);
    }
  }

  async continueAsNew(_input: JsonValue): Promise<never> {
    throw new Error("continueAsNew: not yet implemented in in-memory context");
  }
}
