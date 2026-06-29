// resilient() higher-order wrapper: applies a composed policy to any async function.

import type { Result } from "@veritas/core";
import { compose } from "./policy.js";
import type { Policy } from "./policy.js";

export interface ResilientOptions<T> {
  /** Ordered list of policies (outermost first). */
  readonly policies: ReadonlyArray<Policy<T>>;
}

/**
 * Wrap an async function with the given resilience policies.
 * Returns a new function with the same signature that returns Result<T, unknown>.
 */
export function resilient<Args extends readonly unknown[], T>(
  fn: (...args: Args) => Promise<T>,
  opts: ResilientOptions<T>
): (...args: Args) => Promise<Result<T, unknown>> {
  const policy = compose(...opts.policies);
  return (...args: Args): Promise<Result<T, unknown>> => policy(() => fn(...args));
}

/**
 * Method decorator factory for class methods returning Promise<T>.
 * Usage: @withResilience({ policies: [...] })
 */
export function withResilience<T>(opts: ResilientOptions<T>) {
  return function (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<(...args: unknown[]) => Promise<T>>
  ): TypedPropertyDescriptor<(...args: unknown[]) => Promise<T>> {
    const original = descriptor.value;
    if (typeof original !== "function") return descriptor;
    const policy = compose(...opts.policies);
    descriptor.value = function (this: unknown, ...args: unknown[]): Promise<T> {
      return policy(() => original.apply(this, args) as Promise<T>).then((r) => {
        if (r.ok) return r.value;
        throw r.error;
      });
    };
    return descriptor;
  };
}
