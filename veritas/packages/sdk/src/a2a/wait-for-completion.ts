// Polls an order until it reaches a terminal status or the timeout elapses.
import { sleep } from "@veritas/core";
import { OrderStatus } from "@veritas/core";
import { WaitForCompletionTimeoutError } from "../errors.js";
import type { Order, WaitForCompletionOptions } from "../types.js";

const DEFAULT_POLL_INTERVAL_MS = 3_000;
const DEFAULT_TIMEOUT_MS = 300_000; // 5 minutes

/** Terminal order statuses — polling stops when any of these is reached. */
const TERMINAL_STATUSES: ReadonlySet<string> = new Set([
  OrderStatus.FULFILLED,
  OrderStatus.CANCELLED,
  OrderStatus.FAILED,
  OrderStatus.REFUNDED,
]);

/**
 * Fetcher signature: given an orderId, returns the latest Order.
 * Injected so this function stays decoupled from the HTTP layer.
 */
export type OrderFetcher = (orderId: string) => Promise<Order>;

/**
 * Polls the order until it reaches a terminal status or the wall-clock
 * timeout elapses.  Returns the final Order on success.
 * Throws WaitForCompletionTimeoutError if the deadline is exceeded.
 */
export async function waitForCompletion(
  orderId: string,
  fetchOrder: OrderFetcher,
  opts: WaitForCompletionOptions = {}
): Promise<Order> {
  const {
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    onPoll,
  } = opts;

  const deadline = Date.now() + timeoutMs;

  while (true) {
    const order = await fetchOrder(orderId);

    if (onPoll) {
      onPoll(order);
    }

    if (TERMINAL_STATUSES.has(order.status)) {
      return order;
    }

    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new WaitForCompletionTimeoutError(orderId, timeoutMs);
    }

    // Sleep for the lesser of the poll interval and the remaining time.
    await sleep(Math.min(pollIntervalMs, remaining));

    if (Date.now() >= deadline) {
      throw new WaitForCompletionTimeoutError(orderId, timeoutMs);
    }
  }
}
