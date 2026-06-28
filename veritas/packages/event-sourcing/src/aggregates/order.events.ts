// Domain events for the Order aggregate lifecycle.
import type { OrderStatus } from "@veritas/core";
import type { Money } from "@veritas/contracts";

export const ORDER_PLACED = "OrderPlaced" as const;
export const ORDER_ACCEPTED = "OrderAccepted" as const;
export const ORDER_JOB_LINKED = "OrderJobLinked" as const;
export const ORDER_SETTLEMENT_LINKED = "OrderSettlementLinked" as const;
export const ORDER_COMPLETED = "OrderCompleted" as const;
export const ORDER_CANCELLED = "OrderCancelled" as const;
export const ORDER_REFUNDED = "OrderRefunded" as const;

export type OrderEventType =
  | typeof ORDER_PLACED
  | typeof ORDER_ACCEPTED
  | typeof ORDER_JOB_LINKED
  | typeof ORDER_SETTLEMENT_LINKED
  | typeof ORDER_COMPLETED
  | typeof ORDER_CANCELLED
  | typeof ORDER_REFUNDED;

export interface OrderPlacedPayload {
  readonly orderId: string;
  readonly serviceId: string;
  readonly buyerAgentId: string;
  readonly negotiationId: string | null;
  readonly price: Money;
  readonly metadata: Record<string, unknown>;
}

export interface OrderAcceptedPayload {
  readonly acceptedAt: string;
}

export interface OrderJobLinkedPayload {
  readonly jobId: string;
}

export interface OrderSettlementLinkedPayload {
  readonly settlementId: string;
}

export interface OrderCompletedPayload {
  readonly completedAt: string;
}

export interface OrderCancelledPayload {
  readonly reason: string;
  readonly cancelledAt: string;
}

export interface OrderRefundedPayload {
  readonly reason: string;
  readonly refundedAt: string;
}

export type OrderEventPayload =
  | { type: typeof ORDER_PLACED; data: OrderPlacedPayload }
  | { type: typeof ORDER_ACCEPTED; data: OrderAcceptedPayload }
  | { type: typeof ORDER_JOB_LINKED; data: OrderJobLinkedPayload }
  | { type: typeof ORDER_SETTLEMENT_LINKED; data: OrderSettlementLinkedPayload }
  | { type: typeof ORDER_COMPLETED; data: OrderCompletedPayload }
  | { type: typeof ORDER_CANCELLED; data: OrderCancelledPayload }
  | { type: typeof ORDER_REFUNDED; data: OrderRefundedPayload };

export type { OrderStatus, Money };
