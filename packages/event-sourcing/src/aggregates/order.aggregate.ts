// Order aggregate: tracks status transitions for a paid verification order.
import { ValidationError, OrderStatus } from "@veritas/core";
import type { Money } from "@veritas/contracts";
import { AggregateRoot } from "../aggregate-root.js";
import type { StoredEvent } from "../domain-event.js";
import {
  ORDER_PLACED,
  ORDER_ACCEPTED,
  ORDER_JOB_LINKED,
  ORDER_SETTLEMENT_LINKED,
  ORDER_COMPLETED,
  ORDER_CANCELLED,
  ORDER_REFUNDED,
} from "./order.events.js";
import type {
  OrderPlacedPayload,
  OrderAcceptedPayload,
  OrderJobLinkedPayload,
  OrderSettlementLinkedPayload,
  OrderCompletedPayload,
  OrderCancelledPayload,
  OrderRefundedPayload,
} from "./order.events.js";

export class OrderAggregate extends AggregateRoot {
  readonly aggregateType = "Order" as const;

  private _id: string = "";
  private _serviceId: string = "";
  private _buyerAgentId: string = "";
  private _negotiationId: string | null = null;
  private _price: Money | null = null;
  private _status: OrderStatus = OrderStatus.PENDING;
  private _jobId: string | null = null;
  private _settlementId: string | null = null;
  private _metadata: Record<string, unknown> = {};

  get id(): string { return this._id; }
  get serviceId(): string { return this._serviceId; }
  get buyerAgentId(): string { return this._buyerAgentId; }
  get negotiationId(): string | null { return this._negotiationId; }
  get price(): Money | null { return this._price; }
  get status(): OrderStatus { return this._status; }
  get jobId(): string | null { return this._jobId; }
  get settlementId(): string | null { return this._settlementId; }
  get metadata(): Record<string, unknown> { return this._metadata; }

  static place(
    orderId: string,
    serviceId: string,
    buyerAgentId: string,
    price: Money,
    negotiationId: string | null = null,
    metadata: Record<string, unknown> = {}
  ): OrderAggregate {
    const agg = new OrderAggregate();
    agg._id = orderId;
    const payload: OrderPlacedPayload = {
      orderId,
      serviceId,
      buyerAgentId,
      negotiationId,
      price,
      metadata,
    };
    agg.raise(ORDER_PLACED, payload);
    return agg;
  }

  accept(acceptedAt: string): void {
    if (this._status !== OrderStatus.PENDING) {
      throw new ValidationError({ message: `Order can only be accepted from pending state, current: ${this._status}` });
    }
    const payload: OrderAcceptedPayload = { acceptedAt };
    this.raise(ORDER_ACCEPTED, payload);
  }

  linkJob(jobId: string): void {
    if (this._status !== OrderStatus.PAID) {
      throw new ValidationError({ message: `Job can only be linked when order is paid, current: ${this._status}` });
    }
    const payload: OrderJobLinkedPayload = { jobId };
    this.raise(ORDER_JOB_LINKED, payload);
  }

  linkSettlement(settlementId: string): void {
    const payload: OrderSettlementLinkedPayload = { settlementId };
    this.raise(ORDER_SETTLEMENT_LINKED, payload);
  }

  complete(completedAt: string): void {
    if (this._status === OrderStatus.CANCELLED || this._status === OrderStatus.REFUNDED) {
      throw new ValidationError({ message: `Cannot complete order in state: ${this._status}` });
    }
    const payload: OrderCompletedPayload = { completedAt };
    this.raise(ORDER_COMPLETED, payload);
  }

  cancel(reason: string, cancelledAt: string): void {
    if (this._status === OrderStatus.FULFILLED || this._status === OrderStatus.REFUNDED) {
      throw new ValidationError({ message: `Cannot cancel order in state: ${this._status}` });
    }
    const payload: OrderCancelledPayload = { reason, cancelledAt };
    this.raise(ORDER_CANCELLED, payload);
  }

  refund(reason: string, refundedAt: string): void {
    if (this._status !== OrderStatus.FULFILLED && this._status !== OrderStatus.CANCELLED) {
      throw new ValidationError({ message: `Refund only allowed from fulfilled or cancelled, current: ${this._status}` });
    }
    const payload: OrderRefundedPayload = { reason, refundedAt };
    this.raise(ORDER_REFUNDED, payload);
  }

  apply(event: StoredEvent): void {
    switch (event.eventType) {
      case ORDER_PLACED: {
        const p = event.payload as OrderPlacedPayload;
        this._id = p.orderId;
        this._serviceId = p.serviceId;
        this._buyerAgentId = p.buyerAgentId;
        this._negotiationId = p.negotiationId;
        this._price = p.price;
        this._metadata = p.metadata;
        this._status = OrderStatus.PENDING;
        break;
      }
      case ORDER_ACCEPTED: {
        this._status = OrderStatus.PAID;
        break;
      }
      case ORDER_JOB_LINKED: {
        const p = event.payload as OrderJobLinkedPayload;
        this._jobId = p.jobId;
        this._status = OrderStatus.PAID;
        break;
      }
      case ORDER_SETTLEMENT_LINKED: {
        const p = event.payload as OrderSettlementLinkedPayload;
        this._settlementId = p.settlementId;
        break;
      }
      case ORDER_COMPLETED: {
        this._status = OrderStatus.FULFILLED;
        break;
      }
      case ORDER_CANCELLED: {
        this._status = OrderStatus.CANCELLED;
        break;
      }
      case ORDER_REFUNDED: {
        this._status = OrderStatus.REFUNDED;
        break;
      }
    }
  }
}
