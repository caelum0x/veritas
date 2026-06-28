// Mapper between Order domain objects and persistence row representation.
import { epochToIso, isoToEpoch, newId, type IsoTimestamp } from "@veritas/core";
import type { Order, CreateOrder } from "@veritas/contracts";

/** Raw persistence row for an Order (stored as plain object). */
export interface OrderRow {
  readonly id: string;
  readonly negotiationId: string | null;
  readonly serviceId: string;
  readonly buyerAgentId: string;
  readonly jobId: string | null;
  readonly status: string;
  readonly priceAmount: string;
  readonly priceCurrency: string;
  readonly settlementId: string | null;
  readonly metadata: Record<string, unknown> | undefined;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** Map a persistence row to an Order domain object. */
export function rowToOrder(row: OrderRow): Order {
  return {
    id: row.id as Order["id"],
    negotiationId: row.negotiationId as Order["negotiationId"],
    serviceId: row.serviceId as Order["serviceId"],
    buyerAgentId: row.buyerAgentId as Order["buyerAgentId"],
    jobId: row.jobId as Order["jobId"],
    status: row.status as Order["status"],
    price: { amount: row.priceAmount, currency: row.priceCurrency as "USDC" },
    settlementId: row.settlementId as Order["settlementId"],
    metadata: row.metadata,
    createdAt: epochToIso(row.createdAt),
    updatedAt: epochToIso(row.updatedAt),
  };
}

/** Map an Order domain object to a persistence row. */
export function orderToRow(order: Order): OrderRow {
  return {
    id: order.id,
    negotiationId: order.negotiationId ?? null,
    serviceId: order.serviceId,
    buyerAgentId: order.buyerAgentId,
    jobId: order.jobId ?? null,
    status: order.status,
    priceAmount: order.price.amount,
    priceCurrency: order.price.currency,
    settlementId: order.settlementId ?? null,
    metadata: order.metadata,
    createdAt: isoToEpoch(order.createdAt) ?? 0,
    updatedAt: isoToEpoch(order.updatedAt) ?? 0,
  };
}

/** Create a new Order domain object from a CreateOrder DTO. */
export function createDtoToOrder(dto: CreateOrder, now: IsoTimestamp): Order {
  const id = newId("order") as Order["id"];
  return {
    id,
    negotiationId: (dto.negotiationId ?? null) as Order["negotiationId"],
    serviceId: dto.serviceId as Order["serviceId"],
    buyerAgentId: dto.buyerAgentId as Order["buyerAgentId"],
    jobId: null,
    status: "PENDING" as Order["status"],
    price: { amount: dto.price.amount, currency: dto.price.currency },
    settlementId: null,
    metadata: dto.metadata,
    createdAt: now,
    updatedAt: now,
  };
}
