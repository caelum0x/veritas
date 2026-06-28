// Reconnect and exponential-backoff helpers for the CAP WebSocket provider.

import { sleep, Logger } from "@veritas/core";
import { CapConnectionError } from "./errors.js";

/** Options controlling reconnect behaviour. */
export interface ReconnectOptions {
  /** Maximum number of reconnect attempts before giving up. */
  readonly maxAttempts: number;
  /** Base delay in milliseconds for the first retry. */
  readonly baseDelayMs: number;
  /** Maximum delay cap in milliseconds. Defaults to 30 000. */
  readonly maxDelayMs?: number;
  /** Jitter fraction [0, 1] applied to each delay. Defaults to 0.2. */
  readonly jitter?: number;
}

/** Default reconnect options. */
export const DEFAULT_RECONNECT_OPTIONS: ReconnectOptions = {
  maxAttempts: 10,
  baseDelayMs: 1_000,
  maxDelayMs: 30_000,
  jitter: 0.2,
};

/**
 * Computes the delay (ms) for a given attempt using full exponential backoff
 * with optional jitter. Attempt numbering starts at 1.
 */
export function computeReconnectDelay(attempt: number, opts: ReconnectOptions): number {
  const maxDelay = opts.maxDelayMs ?? 30_000;
  const jitter = opts.jitter ?? 0.2;
  const base = opts.baseDelayMs * Math.pow(2, attempt - 1);
  const capped = Math.min(base, maxDelay);
  const noise = capped * jitter * Math.random();
  return Math.round(capped + noise);
}

/**
 * Manages reconnect state for a CAP WebSocket session.
 * Tracks attempt count and surfaces typed errors when the limit is reached.
 */
export interface ReconnectManager {
  /** Current attempt number (starts at 0; increments on each call to nextDelay). */
  readonly attempts: number;
  /** Whether the maximum number of attempts has been exhausted. */
  readonly exhausted: boolean;
  /**
   * Increments the attempt counter, sleeps for the computed delay, then
   * returns the delay that was applied. Throws CapConnectionError when
   * attempts are exhausted.
   */
  waitForNext(): Promise<number>;
  /** Reset the attempt counter (call after a successful connection). */
  reset(): void;
}

/** Creates a stateful ReconnectManager for a single CAP provider instance. */
export function makeReconnectManager(
  opts: ReconnectOptions = DEFAULT_RECONNECT_OPTIONS,
  logger: Logger,
): ReconnectManager {
  let attempts = 0;

  return {
    get attempts() {
      return attempts;
    },
    get exhausted() {
      return attempts >= opts.maxAttempts;
    },
    async waitForNext(): Promise<number> {
      if (attempts >= opts.maxAttempts) {
        throw new CapConnectionError(
          `CAP WebSocket reconnect failed after ${opts.maxAttempts} attempts.`,
        );
      }
      attempts++;
      const delay = computeReconnectDelay(attempts, opts);
      logger.warn("[cap:reconnect] waiting before reconnect", {
        attempt: attempts,
        maxAttempts: opts.maxAttempts,
        delayMs: delay,
      });
      await sleep(delay);
      return delay;
    },
    reset(): void {
      if (attempts > 0) {
        logger.info("[cap:reconnect] connection restored, resetting counter", {
          previousAttempts: attempts,
        });
      }
      attempts = 0;
    },
  };
}
