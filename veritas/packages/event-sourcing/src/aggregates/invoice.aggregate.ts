// Invoice aggregate root managing billing lifecycle via event sourcing.
import { AggregateRoot } from "../aggregate-root.js";
import type { StoredEvent } from "../domain-event.js";
import type { DomainEventMetadata } from "../domain-event.js";
import {
  INVOICE_CREATED,
  INVOICE_FINALIZED,
  INVOICE_PAID,
  INVOICE_VOIDED,
  INVOICE_OVERDUE,
  INVOICE_LINE_ITEM_ADDED,
  INVOICE_STATUS,
} from "./invoice.events.js";
import type {
  InvoiceState,
  InvoiceCreatedPayload,
  InvoiceFinalizedPayload,
  InvoicePaidPayload,
  InvoiceVoidedPayload,
  InvoiceOverduePayload,
  InvoiceLineItemAddedPayload,
  InvoiceLineItemPayload,
} from "./invoice.events.js";

const AGGREGATE_TYPE = "Invoice" as const;

const INITIAL_STATE: InvoiceState = {
  invoiceId: "",
  organizationId: "",
  subscriptionId: undefined,
  status: INVOICE_STATUS.DRAFT,
  lineItems: [],
  totalAmountUsdc: "0",
  billingPeriodStart: "",
  billingPeriodEnd: "",
  currency: "USDC",
  dueAt: "",
  paidAt: undefined,
  voidedAt: undefined,
};

export class InvoiceAggregate extends AggregateRoot {
  readonly aggregateType = AGGREGATE_TYPE;

  private _state: InvoiceState = INITIAL_STATE;

  get id(): string {
    return this._state.invoiceId;
  }

  get state(): Readonly<InvoiceState> {
    return this._state;
  }

  static create(
    params: InvoiceCreatedPayload,
    metadata?: DomainEventMetadata
  ): InvoiceAggregate {
    const aggregate = new InvoiceAggregate();
    aggregate.raise(INVOICE_CREATED, params, metadata);
    return aggregate;
  }

  addLineItem(
    lineItem: InvoiceLineItemPayload,
    metadata?: DomainEventMetadata
  ): void {
    if (this._state.status !== INVOICE_STATUS.DRAFT) {
      throw new Error(`Cannot add line item to invoice in status ${this._state.status}`);
    }
    const payload: InvoiceLineItemAddedPayload = { lineItem };
    this.raise(INVOICE_LINE_ITEM_ADDED, payload, metadata);
  }

  finalize(
    totalAmountUsdc: string,
    finalizedAt: string,
    metadata?: DomainEventMetadata
  ): void {
    if (this._state.status !== INVOICE_STATUS.DRAFT) {
      throw new Error(`Cannot finalize invoice in status ${this._state.status}`);
    }
    const payload: InvoiceFinalizedPayload = { totalAmountUsdc, finalizedAt };
    this.raise(INVOICE_FINALIZED, payload, metadata);
  }

  markPaid(
    amountPaidUsdc: string,
    paidAt: string,
    transactionId?: string,
    metadata?: DomainEventMetadata
  ): void {
    if (this._state.status !== INVOICE_STATUS.OPEN) {
      throw new Error(`Cannot mark paid invoice in status ${this._state.status}`);
    }
    const payload: InvoicePaidPayload = { amountPaidUsdc, paidAt, transactionId };
    this.raise(INVOICE_PAID, payload, metadata);
  }

  void_(reason: string, voidedAt: string, metadata?: DomainEventMetadata): void {
    if (this._state.status === INVOICE_STATUS.PAID || this._state.status === INVOICE_STATUS.VOID) {
      throw new Error(`Cannot void invoice in status ${this._state.status}`);
    }
    const payload: InvoiceVoidedPayload = { reason, voidedAt };
    this.raise(INVOICE_VOIDED, payload, metadata);
  }

  markOverdue(overdueAt: string, metadata?: DomainEventMetadata): void {
    if (this._state.status !== INVOICE_STATUS.OPEN) {
      throw new Error(`Cannot mark overdue invoice in status ${this._state.status}`);
    }
    const payload: InvoiceOverduePayload = { overdueAt };
    this.raise(INVOICE_OVERDUE, payload, metadata);
  }

  apply(event: StoredEvent): void {
    switch (event.eventType) {
      case INVOICE_CREATED: {
        const p = event.payload as InvoiceCreatedPayload;
        this._state = {
          ...INITIAL_STATE,
          invoiceId: p.invoiceId,
          organizationId: p.organizationId,
          subscriptionId: p.subscriptionId,
          status: INVOICE_STATUS.DRAFT,
          billingPeriodStart: p.billingPeriodStart,
          billingPeriodEnd: p.billingPeriodEnd,
          currency: p.currency,
          dueAt: p.dueAt,
        };
        break;
      }
      case INVOICE_LINE_ITEM_ADDED: {
        const p = event.payload as InvoiceLineItemAddedPayload;
        this._state = {
          ...this._state,
          lineItems: [...this._state.lineItems, p.lineItem],
        };
        break;
      }
      case INVOICE_FINALIZED: {
        const p = event.payload as InvoiceFinalizedPayload;
        this._state = {
          ...this._state,
          status: INVOICE_STATUS.OPEN,
          totalAmountUsdc: p.totalAmountUsdc,
        };
        break;
      }
      case INVOICE_PAID: {
        const p = event.payload as InvoicePaidPayload;
        this._state = {
          ...this._state,
          status: INVOICE_STATUS.PAID,
          paidAt: p.paidAt,
        };
        break;
      }
      case INVOICE_VOIDED: {
        const p = event.payload as InvoiceVoidedPayload;
        this._state = {
          ...this._state,
          status: INVOICE_STATUS.VOID,
          voidedAt: p.voidedAt,
        };
        break;
      }
      case INVOICE_OVERDUE: {
        this._state = { ...this._state, status: INVOICE_STATUS.UNCOLLECTIBLE };
        break;
      }
      default:
        break;
    }
  }
}
