// Timeout wrapper: races an async operation against a deadline and returns a Result.
import { Result, ok, err } from "@veritas/core";
import { TimeoutError } from "./errors.js";
import type { TimeoutOptions } from "./types.js";

/**
 * Execute fn and reject with TimeoutError if it doesn't resolve within opts.timeoutMs.
 * The in-flight promise is not cancelled (Node has no cancellation primitives), but the
 * caller receives an err immediately once the deadline passes.
 */
export async function withDeadline<T>(
  fn: () => Promise<T>,
  opts: TimeoutOptions
): Promise<Result<T, TimeoutError | unknown>> {
  const { timeoutMs } = opts;

  let timerId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = setTimeout(() => reject(new TimeoutError(timeoutMs)), timeoutMs);
  });

  try {
    const value = await Promise.race([fn(), timeoutPromise]);
    clearTimeout(timerId);
    return ok(value);
  } catch (e) {
    clearTimeout(timerId);
    return err(e);
  }
}

/** Convenience class when the same timeout config is reused across many calls. */
export class TimeoutPolicy {
  private readonly opts: TimeoutOptions;

  constructor(opts: TimeoutOptions) {
    this.opts = opts;
  }

  execute<T>(fn: () => Promise<T>): Promise<Result<T, TimeoutError | unknown>> {
    return withDeadline(fn, this.opts);
  }
}
