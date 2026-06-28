// Concurrency primitives: a semaphore limiter and bounded parallel map.

/** A function that runs a task when capacity is available. */
export type Limiter = <T>(task: () => Promise<T>) => Promise<T>;

/**
 * Create a limiter that allows at most `concurrency` tasks to run at once.
 * Excess tasks queue and start as running ones complete.
 */
export function pLimit(concurrency: number): Limiter {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error(`pLimit requires a positive integer, got ${concurrency}`);
  }
  let active = 0;
  const queue: Array<() => void> = [];

  const next = (): void => {
    active -= 1;
    const resume = queue.shift();
    if (resume) resume();
  };

  return <T>(task: () => Promise<T>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const run = (): void => {
        active += 1;
        task().then(
          (value) => {
            resolve(value);
            next();
          },
          (error: unknown) => {
            reject(error);
            next();
          },
        );
      };
      if (active < concurrency) run();
      else queue.push(run);
    });
  };
}

/**
 * Map over items with bounded concurrency, preserving input order in results.
 * Rejects on the first error (like Promise.all).
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const limit = pLimit(concurrency);
  return Promise.all(items.map((item, index) => limit(() => fn(item, index))));
}
