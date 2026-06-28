// Maps OrderOutput domain objects to HTTP response shapes and vice-versa.
import type { OrderOutput } from "@veritas/services";
import type { Page } from "@veritas/core";

/** HTTP response shape for a single order. */
export interface OrderResponse {
  readonly id: string;
  readonly negotiationId: string | null;
  readonly serviceId: string;
  readonly buyerAgentId: string;
  readonly jobId: string | null;
  readonly status: string;
  readonly price: { amount: string; currency: string };
  readonly settlementId: string | null;
  readonly metadata?: Record<string, string>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** HTTP response shape for a paginated list of orders. */
export interface OrderListResponse {
  readonly items: readonly OrderResponse[];
  readonly nextCursor: string | null | undefined;
  readonly hasMore: boolean;
}

/** Convert a domain OrderOutput to an HTTP-safe OrderResponse. */
export function toOrderResponse(order: OrderOutput): OrderResponse {
  return {
    id: order.id,
    negotiationId: order.negotiationId ?? null,
    serviceId: order.serviceId,
    buyerAgentId: order.buyerAgentId,
    jobId: order.jobId ?? null,
    status: order.status,
    price: order.price,
    settlementId: order.settlementId ?? null,
    metadata: order.metadata,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

/** Convert a Page<OrderOutput> to an HTTP-safe OrderListResponse. */
export function toOrderListResponse(page: Page<OrderOutput>): OrderListResponse {
  return {
    items: page.items.map(toOrderResponse),
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
  };
}
