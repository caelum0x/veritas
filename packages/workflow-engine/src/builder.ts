// Fluent builder for composing typed workflow definitions.
import type { JsonValue, RetryPolicy, TimeoutPolicy, WorkflowId } from "./types.js";
import { DEFAULT_RETRY_POLICY } from "./types.js";
import type { WorkflowContext, ScheduleActivityOptions } from "./context.js";

export type WorkflowFn<TInput extends JsonValue = JsonValue, TOutput extends JsonValue = JsonValue> =
  (ctx: WorkflowContext, input: TInput) => Promise<TOutput>;

export type ActivityFn<TInput extends JsonValue = JsonValue, TOutput extends JsonValue = JsonValue> =
  (input: TInput) => Promise<TOutput>;

export interface ActivityDefinition<
  TInput extends JsonValue = JsonValue,
  TOutput extends JsonValue = JsonValue,
> {
  readonly name: string;
  readonly handler: ActivityFn<TInput, TOutput>;
  readonly retryPolicy: RetryPolicy;
  readonly timeoutPolicy: TimeoutPolicy;
}

export interface WorkflowDefinition<
  TInput extends JsonValue = JsonValue,
  TOutput extends JsonValue = JsonValue,
> {
  readonly workflowId: WorkflowId;
  readonly name: string;
  readonly fn: WorkflowFn<TInput, TOutput>;
  readonly activities: ReadonlyMap<string, ActivityDefinition>;
  readonly retryPolicy: RetryPolicy;
  readonly timeoutPolicy: TimeoutPolicy;
}

class ActivityBuilder<TInput extends JsonValue, TOutput extends JsonValue> {
  private _retryPolicy: RetryPolicy = { ...DEFAULT_RETRY_POLICY };
  private _timeoutPolicy: TimeoutPolicy = {};

  constructor(
    private readonly _name: string,
    private readonly _handler: ActivityFn<TInput, TOutput>
  ) {}

  withRetry(policy: Partial<RetryPolicy>): this {
    this._retryPolicy = { ...this._retryPolicy, ...policy };
    return this;
  }

  withTimeout(policy: TimeoutPolicy): this {
    this._timeoutPolicy = { ...this._timeoutPolicy, ...policy };
    return this;
  }

  build(): ActivityDefinition<TInput, TOutput> {
    return {
      name: this._name,
      handler: this._handler,
      retryPolicy: { ...this._retryPolicy },
      timeoutPolicy: { ...this._timeoutPolicy },
    };
  }
}

export class WorkflowBuilder<
  TInput extends JsonValue = JsonValue,
  TOutput extends JsonValue = JsonValue,
> {
  private _name = "unnamed-workflow";
  private _fn: WorkflowFn<TInput, TOutput> | undefined;
  private _retryPolicy: RetryPolicy = { ...DEFAULT_RETRY_POLICY };
  private _timeoutPolicy: TimeoutPolicy = {};
  private readonly _activities = new Map<string, ActivityDefinition>();

  constructor(private readonly _workflowId: WorkflowId) {}

  named(name: string): this {
    this._name = name;
    return this;
  }

  execute(fn: WorkflowFn<TInput, TOutput>): this {
    this._fn = fn;
    return this;
  }

  withRetry(policy: Partial<RetryPolicy>): this {
    this._retryPolicy = { ...this._retryPolicy, ...policy };
    return this;
  }

  withTimeout(policy: TimeoutPolicy): this {
    this._timeoutPolicy = { ...this._timeoutPolicy, ...policy };
    return this;
  }

  activity<AI extends JsonValue, AO extends JsonValue>(
    name: string,
    handler: ActivityFn<AI, AO>,
    configure?: (b: ActivityBuilder<AI, AO>) => ActivityBuilder<AI, AO>
  ): this {
    const b = new ActivityBuilder<AI, AO>(name, handler);
    const final = configure ? configure(b) : b;
    this._activities.set(name, final.build() as unknown as ActivityDefinition);
    return this;
  }

  build(): WorkflowDefinition<TInput, TOutput> {
    if (this._fn === undefined) {
      throw new Error(`WorkflowBuilder: no execute() fn provided for "${this._name}"`);
    }
    return {
      workflowId: this._workflowId,
      name: this._name,
      fn: this._fn,
      activities: new Map(this._activities),
      retryPolicy: { ...this._retryPolicy },
      timeoutPolicy: { ...this._timeoutPolicy },
    };
  }
}

/** Convenience factory to start building a workflow. */
export function defineWorkflow<
  TInput extends JsonValue = JsonValue,
  TOutput extends JsonValue = JsonValue,
>(workflowId: WorkflowId): WorkflowBuilder<TInput, TOutput> {
  return new WorkflowBuilder<TInput, TOutput>(workflowId);
}
