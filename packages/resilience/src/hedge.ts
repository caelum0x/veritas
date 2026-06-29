// Hedged-request pattern: fire a second request after a delay if the first hasn't resolved.

import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";

export interface HedgeOptions {
  /** Delay in ms before launching the hedge request. */
  readonly delayMs: number;
  /** Max concurrent hedge attempts (default 2 = original + 1 hedge). */
  readonly maxAttempts?: number;
}

/** Execute fn up to maxAttempts times with staggered delays; return the first success. */
export async function hedge<T>(
  fn: () => Promise<T>,
  opts: HedgeOptions
): Promise<Result<T, unknown>> {
  const maxAttempts = opts.maxAttempts ?? 2;
  const { delayMs } = opts;

  return new Promise<Result<T, unknown>>((resolve) => {
    let settled = false;
    let launched = 0;
    const errors: unknown[] = [];

    const launch = (): void => {
      if (settled) return;
      const attempt = launched++;

      void (async () => {
        try {
          const value = await fn();
          if (!settled) {
            settled = true;
            resolve(ok(value));
          }
        } catch (e) {
          errors[attempt] = e;
          if (errors.filter(Boolean).length === maxAttempts) {
            resolve(err(errors[0]));
          }
        }
      })();
    };

    // First attempt immediately.
    launch();

    // Schedule subsequent attempts.
    for (let i = 1; i < maxAttempts; i++) {
      const delay = delayMs * i;
      setTimeout(() => {
        if (!settled) launch();
      }, delay);
    }
  });
}
