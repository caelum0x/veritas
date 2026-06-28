// Handles order-rejected CAP lifecycle event: cleans up pending state and logs rejection.

import { ok, epochToIso, systemClock } from "@veritas/core";
import type { Result, AppError, Logger } from "@veritas/core";
import type { Order } from "@veritas/contracts";

/** Context for an order rejection event. */
export interface OrderRejectedEvent {
  readonly order: Order;
  /** Human-readable reason why the order was rejected. */
  readonly reason: string;
}

/** Outcome of handling the rejection — carries information for the caller. */
export interface OrderRejectedResult {
  readonly orderId: string;
  readonly reason: string;
  readonly rejectedAt: string;
}

/**
 * Handle an order-rejected event by logging diagnostics and returning a
 * structured result so callers can propagate the rejection upstream if needed.
 */
export async function handleOrderRejected(
  event: OrderRejectedEvent,
  logger: Logger,
  /** Optional callback invoked with the orderId so callers can evict caches. */
  onCleanup?: (orderId: string) => Promise<void>,
): Promise<Result<OrderRejectedResult, AppError>> {
  const { order, reason } = event;
  const rejectedAt = epochToIso(systemClock.now());

  logger.warn("order.rejected", {
    orderId: order.id,
    buyerAgentId: order.buyerAgentId,
    serviceId: order.serviceId,
    price: order.price,
    reason,
    rejectedAt,
  });

  if (onCleanup !== undefined) {
    await onCleanup(order.id);
  }

  return ok({ orderId: order.id, reason, rejectedAt });
}
