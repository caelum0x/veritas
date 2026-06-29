// rate-control.ts: polite per-host request throttling for importers.

import { sleep } from "@veritas/core";
import type { RateControlOptions } from "./types.js";
import { RateLimitError } from "./errors.js";
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";

/** Per-host state tracked by the rate controller. */
interface HostState {
  lastRequestAt: number;
  inFlight: number;
}

/** Runtime rate controller implementing polite per-host delays and concurrency limits. */
export interface RateController {
  /** Acquire a slot for the given host, waiting as needed. Rejects if over concurrency limit. */
  acquire(host: string): Promise<Result<void>>;
  /** Release the in-flight slot after a request completes. */
  release(host: string): void;
  /** Wrap an async operation with acquire/release lifecycle. */
  withHost<T>(host: string, fn: () => Promise<T>): Promise<Result<T>>;
}

/** Parse the host from a URL string; returns the raw input on failure. */
function parseHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/** Create a RateController with the supplied options. */
export function createRateController(opts: RateControlOptions): RateController {
  const { minDelayMs, maxConcurrency } = opts;
  const hostState = new Map<string, HostState>();

  function getState(host: string): HostState {
    let state = hostState.get(host);
    if (!state) {
      state = { lastRequestAt: 0, inFlight: 0 };
      hostState.set(host, state);
    }
    return state;
  }

  async function acquire(host: string): Promise<Result<void>> {
    const state = getState(host);
    if (state.inFlight >= maxConcurrency) {
      return err(new RateLimitError(host));
    }
    const elapsed = Date.now() - state.lastRequestAt;
    if (elapsed < minDelayMs) {
      await sleep(minDelayMs - elapsed);
    }
    state.inFlight++;
    state.lastRequestAt = Date.now();
    return ok(undefined);
  }

  function release(host: string): void {
    const state = hostState.get(host);
    if (state && state.inFlight > 0) {
      state.inFlight--;
    }
  }

  async function withHost<T>(host: string, fn: () => Promise<T>): Promise<Result<T>> {
    const slot = await acquire(host);
    if (!slot.ok) return slot;
    try {
      const value = await fn();
      return ok(value);
    } catch (e) {
      return err(e);
    } finally {
      release(host);
    }
  }

  return { acquire, release, withHost };
}

/** Convenience: extract hostname and run fn through the rate controller. */
export async function withRateControl<T>(
  controller: RateController,
  url: string,
  fn: () => Promise<T>,
): Promise<Result<T>> {
  const host = parseHost(url);
  return controller.withHost(host, fn);
}
