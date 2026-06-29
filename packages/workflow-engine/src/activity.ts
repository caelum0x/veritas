// Activity/step definition and execution wrapper with retry logic.
import { tryAsync, type Result } from "@veritas/core";
import type { JsonValue, RetryPolicy, TimeoutPolicy, ActivityId } from "./types.js";
import { newActivityId, DEFAULT_RETRY_POLICY } from "./types.js";
import { ActivityFailedError } from "./errors.js";

export interface ActivityContext {
  readonly activityId: ActivityId;
  readonly attempt: number;
  readonly workflowId: string;
  readonly executionId: string;
  heartbeat(details?: JsonValue): void;
}

export interface ActivityDefinition<
  TInput extends JsonValue = JsonValue,
  TOutput extends JsonValue = JsonValue,
> {
  readonly type: string;
  readonly retryPolicy?: RetryPolicy;
  readonly timeoutPolicy?: TimeoutPolicy;
  execute(input: TInput, context: ActivityContext): Promise<TOutput>;
  compensate?(
    input: TInput,
    output: TOutput | null,
    context: ActivityContext
  ): Promise<void>;
}

function computeDelay(policy: RetryPolicy, attempt: number): number {
  const raw = policy.initialDelayMs * Math.pow(policy.backoffMultiplier, attempt - 1);
  return Math.min(raw, policy.maxDelayMs);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function executeActivityWithRetry<
  TInput extends JsonValue,
  TOutput extends JsonValue,
>(
  definition: ActivityDefinition<TInput, TOutput>,
  input: TInput,
  base: Omit<ActivityContext, "attempt">,
  policy: RetryPolicy
): Promise<Result<TOutput, ActivityFailedError>> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt < policy.maxAttempts) {
    attempt++;
    const ctx: ActivityContext = { ...base, attempt };
    const result = await tryAsync(() => definition.execute(input, ctx));

    if (result.ok) return result;

    lastError = result.error;
    if (attempt < policy.maxAttempts) {
      await sleep(computeDelay(policy, attempt));
    }
  }

  return {
    ok: false,
    error: new ActivityFailedError(base.activityId, lastError, attempt),
  };
}

export function createActivityDefinition<
  TInput extends JsonValue,
  TOutput extends JsonValue,
>(def: ActivityDefinition<TInput, TOutput>): ActivityDefinition<TInput, TOutput> {
  return def;
}

export class ActivityRegistry {
  private readonly _defs = new Map<string, ActivityDefinition>();

  register(def: ActivityDefinition): void {
    this._defs.set(def.type, def);
  }

  resolve(type: string): ActivityDefinition | undefined {
    return this._defs.get(type);
  }

  has(type: string): boolean {
    return this._defs.has(type);
  }

  listTypes(): string[] {
    return Array.from(this._defs.keys());
  }
}
