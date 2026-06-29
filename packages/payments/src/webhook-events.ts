// Payment domain events emitted to EventBus for downstream consumers.

import { makeDomainEvent, type DomainEvent, type Id } from "@veritas/core";
import type { Money } from "@veritas/contracts";
import { type PaymentStatus, type PayoutStatus } from "./types.js";

export type PaymentCreatedEvent = DomainEvent<"payment.created", {
  readonly paymentId: Id<string>;
  readonly orderId: Id<string>;
  readonly organizationId: Id<string>;
  readonly amount: Money;
  readonly processorId: string;
}>;

export type PaymentSucceededEvent = DomainEvent<"payment.succeeded", {
  readonly paymentId: Id<string>;
  readonly orderId: Id<string>;
  readonly organizationId: Id<string>;
  readonly amount: Money;
  readonly net: Money;
  readonly processorRef: string;
}>;

export type PaymentFailedEvent = DomainEvent<"payment.failed", {
  readonly paymentId: Id<string>;
  readonly orderId: Id<string>;
  readonly organizationId: Id<string>;
  readonly amount: Money;
  readonly failureReason: string;
}>;

export type PaymentRefundedEvent = DomainEvent<"payment.refunded", {
  readonly refundId: Id<string>;
  readonly paymentId: Id<string>;
  readonly amount: Money;
  readonly reason: string;
}>;

export type PayoutInitiatedEvent = DomainEvent<"payout.initiated", {
  readonly payoutId: Id<string>;
  readonly walletId: Id<string>;
  readonly amount: Money;
  readonly processorId: string;
}>;

export type PayoutCompletedEvent = DomainEvent<"payout.completed", {
  readonly payoutId: Id<string>;
  readonly walletId: Id<string>;
  readonly amount: Money;
  readonly processorRef: string;
}>;

export type PayoutFailedEvent = DomainEvent<"payout.failed", {
  readonly payoutId: Id<string>;
  readonly walletId: Id<string>;
  readonly amount: Money;
  readonly failureReason: string;
}>;

export type PaymentDomainEvent =
  | PaymentCreatedEvent
  | PaymentSucceededEvent
  | PaymentFailedEvent
  | PaymentRefundedEvent
  | PayoutInitiatedEvent
  | PayoutCompletedEvent
  | PayoutFailedEvent;

// Suppress unused-import lint for status types used in downstream consumers.
export type { PaymentStatus, PayoutStatus };

export function makePaymentCreatedEvent(
  payload: PaymentCreatedEvent["payload"],
): PaymentCreatedEvent {
  return makeDomainEvent({ type: "payment.created", payload }) as PaymentCreatedEvent;
}

export function makePaymentSucceededEvent(
  payload: PaymentSucceededEvent["payload"],
): PaymentSucceededEvent {
  return makeDomainEvent({ type: "payment.succeeded", payload }) as PaymentSucceededEvent;
}

export function makePaymentFailedEvent(
  payload: PaymentFailedEvent["payload"],
): PaymentFailedEvent {
  return makeDomainEvent({ type: "payment.failed", payload }) as PaymentFailedEvent;
}

export function makePaymentRefundedEvent(
  payload: PaymentRefundedEvent["payload"],
): PaymentRefundedEvent {
  return makeDomainEvent({ type: "payment.refunded", payload }) as PaymentRefundedEvent;
}

export function makePayoutInitiatedEvent(
  payload: PayoutInitiatedEvent["payload"],
): PayoutInitiatedEvent {
  return makeDomainEvent({ type: "payout.initiated", payload }) as PayoutInitiatedEvent;
}

export function makePayoutCompletedEvent(
  payload: PayoutCompletedEvent["payload"],
): PayoutCompletedEvent {
  return makeDomainEvent({ type: "payout.completed", payload }) as PayoutCompletedEvent;
}

export function makePayoutFailedEvent(
  payload: PayoutFailedEvent["payload"],
): PayoutFailedEvent {
  return makeDomainEvent({ type: "payout.failed", payload }) as PayoutFailedEvent;
}
