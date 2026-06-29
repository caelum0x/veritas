// Bounded concurrency helpers for verification pipeline stages.
import { mapWithConcurrency, pLimit } from "@veritas/core";
import type { Limiter } from "@veritas/core";

export const DEFAULT_CONCURRENCY = 5;

/**
 * Map over items with a bounded concurrency limit.
 * Thin wrapper around @veritas/core mapWithConcurrency with a default limit.
 */
export async function boundedMap<T, U>(
  items: readonly T[],
  fn: (item: T, index: number) => Promise<U>,
  concurrency: number = DEFAULT_CONCURRENCY,
): Promise<U[]> {
  return mapWithConcurrency(items, concurrency, fn);
}

/**
 * Create a reusable concurrency limiter for a pipeline stage.
 * Useful when multiple operations must share the same slot pool.
 */
export function createLimiter(concurrency: number = DEFAULT_CONCURRENCY): Limiter {
  return pLimit(concurrency);
}

/**
 * Run a set of named tasks with bounded concurrency, collecting results by key.
 * Entries are processed in parallel up to `concurrency` at a time.
 */
export async function boundedRecord<K extends string, V>(
  entries: ReadonlyArray<readonly [K, () => Promise<V>]>,
  concurrency: number = DEFAULT_CONCURRENCY,
): Promise<Record<K, V>> {
  const results = await mapWithConcurrency(
    entries,
    concurrency,
    async ([, fn]: readonly [K, () => Promise<V>]) => fn(),
  );

  return Object.fromEntries(
    entries.map(([key], i) => [key, results[i]] as const),
  ) as Record<K, V>;
}

/**
 * Fan-out a single input to multiple async handlers in parallel with a concurrency cap.
 */
export async function fanOut<T, U>(
  input: T,
  handlers: ReadonlyArray<(input: T) => Promise<U>>,
  concurrency: number = DEFAULT_CONCURRENCY,
): Promise<U[]> {
  return mapWithConcurrency(handlers, concurrency, (handler: (input: T) => Promise<U>) => handler(input));
}
