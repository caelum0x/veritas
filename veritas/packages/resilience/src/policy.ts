// Policy composition: wrap an async fn with an ordered chain of resilience policies.

import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";

/** A single resilience policy wraps a thunk and returns a Result. */
export type Policy<T> = (fn: () => Promise<T>) => Promise<Result<T, unknown>>;

/**
 * Compose multiple policies left-to-right (outermost first).
 * Each policy receives a thunk that, when called, invokes the next policy in the chain.
 */
export function compose<T>(...policies: ReadonlyArray<Policy<T>>): Policy<T> {
  return (fn: () => Promise<T>): Promise<Result<T, unknown>> => {
    const run = (index: number, thunk: () => Promise<T>): Promise<Result<T, unknown>> => {
      if (index >= policies.length) {
        return thunk().then(
          (v) => ok(v) as Result<T, unknown>,
          (e) => err(e) as Result<T, unknown>
        );
      }
      const policy = policies[index]!;
      return policy(() =>
        run(index + 1, thunk).then((r) => {
          if (r.ok) return r.value;
          throw r.error;
        })
      );
    };

    return run(0, fn);
  };
}

/** Lift a plain async function into a Policy (no-op pass-through). */
export function liftPolicy<T>(fn: () => Promise<T>): Policy<T> {
  return (_inner: () => Promise<T>) => fn().then(
    (v) => ok(v) as Result<T, unknown>,
    (e) => err(e) as Result<T, unknown>
  );
}

/** Identity policy — executes fn directly, wrapping result in ok/err. */
export function identityPolicy<T>(): Policy<T> {
  return (fn: () => Promise<T>) =>
    fn().then(
      (v) => ok(v) as Result<T, unknown>,
      (e) => err(e) as Result<T, unknown>
    );
}
