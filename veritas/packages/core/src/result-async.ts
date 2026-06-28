// Helpers bridging async/throwing code into Result values.

import { err, ok, type Result } from "./result.js";

/** Run an async thunk, capturing any thrown error into a Result. */
export async function tryAsync<T>(
  fn: () => Promise<T>,
): Promise<Result<T, Error>> {
  try {
    return ok(await fn());
  } catch (cause) {
    return err(cause instanceof Error ? cause : new Error(String(cause)));
  }
}

/** Run a sync thunk, capturing any thrown error into a Result. */
export function trySync<T>(fn: () => T): Result<T, Error> {
  try {
    return ok(fn());
  } catch (cause) {
    return err(cause instanceof Error ? cause : new Error(String(cause)));
  }
}

/** Collect an array of Results into a Result of array (fail-fast). */
export function collect<T, E>(results: readonly Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];
  for (const r of results) {
    if (!r.ok) return r;
    values.push(r.value);
  }
  return ok(values);
}
