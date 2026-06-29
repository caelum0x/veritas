// Handles order-expired CAP lifecycle event: evicts pending state and logs expiry.

import { ok, epochToIso, systemClock } from "@veritas/core";
import type { Result, AppError, Logger } from "@veritas/core";
import type { Order } from "@veritas/contracts";

/** Context describing an expired order. */
export interface OrderExpiredEvent {
  readonly order: Order;
  /** ISO timestamp at which the order was deemed expired. */
  readonly expiredAt: string;
}

/** Result returned after handling order expiry. */
export interface OrderExpiredResult {
  readonly orderId: string;
  readonly expiredAt: string;
  readonly handledAt: string;
}

/**
 * Handle an order-expired event by logging the expiry and invoking any
 * cleanup callback (e.g. evicting the pending-store entry).
 */
export async function handleOrderExpired(
  event: OrderExpiredEvent,
  logger: Logger,
  /** Optional callback to clean up local state keyed by orderId. */
  onCleanup?: (orderId: string) => Promise<void>,
): Promise<Result<OrderExpiredResult, AppError>> {
  const { order, expiredAt } = event;
  const handledAt = epochToIso(systemClock.now());

  logger.warn("order.expired", {
    orderId: order.id,
    buyerAgentId: order.buyerAgentId,
    serviceId: order.serviceId,
    price: order.price,
    status: order.status,
    expiredAt,
    handledAt,
  });

  if (onCleanup !== undefined) {
    await onCleanup(order.id);
  }

  return ok({ orderId: order.id, expiredAt, handledAt });
}
