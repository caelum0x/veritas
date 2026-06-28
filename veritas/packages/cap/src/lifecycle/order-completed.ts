// Handles order-completed CAP lifecycle event: logs settlement and records audit trail.

import { ok, isErr, epochToIso, systemClock } from "@veritas/core";
import type { Result, AppError, Logger } from "@veritas/core";
import type { Order, Settlement } from "@veritas/contracts";

/** Minimal settlement context needed to log completion. */
export interface OrderCompletedEvent {
  readonly order: Order;
  readonly settlement: Settlement;
  readonly deliveredAt: string;
}

/** Result of completing an order — currently a simple acknowledgement. */
export interface OrderCompletedResult {
  readonly orderId: string;
  readonly settlementId: string;
  readonly loggedAt: string;
}

/** Log a completed order and its settlement for audit/metrics purposes. */
export async function handleOrderCompleted(
  event: OrderCompletedEvent,
  logger: Logger,
): Promise<Result<OrderCompletedResult, AppError>> {
  const { order, settlement, deliveredAt } = event;
  const loggedAt = epochToIso(systemClock.now());

  logger.info("order.completed", {
    orderId: order.id,
    settlementId: settlement.id,
    txHash: settlement.txHash,
    chain: settlement.chain,
    amount: settlement.amount,
    buyerAgentId: order.buyerAgentId,
    deliveredAt,
    loggedAt,
  });

  const result: OrderCompletedResult = {
    orderId: order.id,
    settlementId: settlement.id,
    loggedAt,
  };

  return ok(result);
}
