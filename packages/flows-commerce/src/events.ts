// Commerce flow domain events emitted by flow steps for downstream consumers.

import { makeDomainEvent, type DomainEvent, type IsoTimestamp, type Id } from "@veritas/core";

export type CommerceEventType =
  | "commerce.usage_metered"
  | "commerce.invoice_generated"
  | "commerce.charge_completed"
  | "commerce.refund_issued"
  | "commerce.dunning_started"
  | "commerce.dunning_recovered"
  | "commerce.hire_settled";

export interface UsageMeteredPayload {
  readonly organizationId: string;
  readonly metric: string;
  readonly quantity: number;
  readonly usageEventId: string;
  readonly occurredAt: IsoTimestamp;
}

export interface InvoiceGeneratedPayload {
  readonly organizationId: string;
  readonly invoiceId: string;
  readonly subscriptionId: string;
  readonly totalAmount: string;
  readonly periodStart: IsoTimestamp;
  readonly periodEnd: IsoTimestamp;
}

export interface ChargeCompletedPayload {
  readonly organizationId: string;
  readonly paymentId: string;
  readonly orderId: string;
  readonly amount: string;
  readonly currency: string;
}

export interface RefundIssuedPayload {
  readonly organizationId: string;
  readonly paymentId: string;
  readonly refundRef: string;
  readonly amount: string;
  readonly currency: string;
}

export interface DunningStartedPayload {
  readonly organizationId: string;
  readonly subscriptionId: string;
  readonly dunningId: string;
  readonly amountCents: number;
}

export interface DunningRecoveredPayload {
  readonly organizationId: string;
  readonly subscriptionId: string;
  readonly dunningId: string;
}

export interface HireSettledPayload {
  readonly orderId: string;
  readonly organizationId: string;
  readonly amountUsdc: string;
}

export function makeUsageMeteredEvent(payload: UsageMeteredPayload): DomainEvent {
  return makeDomainEvent({ type: "commerce.usage_metered", payload });
}

export function makeInvoiceGeneratedEvent(payload: InvoiceGeneratedPayload): DomainEvent {
  return makeDomainEvent({ type: "commerce.invoice_generated", payload });
}

export function makeChargeCompletedEvent(payload: ChargeCompletedPayload): DomainEvent {
  return makeDomainEvent({ type: "commerce.charge_completed", payload });
}

export function makeRefundIssuedEvent(payload: RefundIssuedPayload): DomainEvent {
  return makeDomainEvent({ type: "commerce.refund_issued", payload });
}

export function makeDunningStartedEvent(payload: DunningStartedPayload): DomainEvent {
  return makeDomainEvent({ type: "commerce.dunning_started", payload });
}

export function makeDunningRecoveredEvent(payload: DunningRecoveredPayload): DomainEvent {
  return makeDomainEvent({ type: "commerce.dunning_recovered", payload });
}

export function makeHireSettledEvent(payload: HireSettledPayload): DomainEvent {
  return makeDomainEvent({ type: "commerce.hire_settled", payload });
}
