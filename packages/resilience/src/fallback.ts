// Fallback policy: returns a default value when the primary call fails.
import { Result, ok, err } from "@veritas/core";
import type { FallbackOptions } from "./types.js";

/**
 * Execute fn; on failure, resolve the fallback value instead of propagating the error.
 * If opts.when is provided, only the fallback is used when predicate(error) is true —
 * otherwise the original error is re-thrown.
 */
export async function withFallback<T>(
  fn: () => Promise<T>,
  opts: FallbackOptions<T>
): Promise<Result<T, unknown>> {
  try {
    return ok(await fn());
  } catch (e) {
    if (opts.when !== undefined && !opts.when(e)) {
      return err(e);
    }
    try {
      const fallbackValue =
        typeof opts.fallback === "function"
          ? await (opts.fallback as () => T | Promise<T>)()
          : opts.fallback;
      return ok(fallbackValue);
    } catch (fallbackError) {
      return err(fallbackError);
    }
  }
}

/** Reusable stateless fallback policy bound to fixed options. */
export class FallbackPolicy<T> {
  private readonly opts: FallbackOptions<T>;

  constructor(opts: FallbackOptions<T>) {
    this.opts = opts;
  }

  execute(fn: () => Promise<T>): Promise<Result<T, unknown>> {
    return withFallback(fn, this.opts);
  }
}
