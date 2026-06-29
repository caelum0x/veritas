// Settlement aggregate: manages payment settlement lifecycle via event sourcing.
import { epochToIso } from "@veritas/core";
import { AggregateRoot } from "../aggregate-root.js";
import type { StoredEvent } from "../domain-event.js";
import {
  SETTLEMENT_CANCELLED,
  SETTLEMENT_COMPLETED,
  SETTLEMENT_FAILED,
  SETTLEMENT_INITIATED,
  SETTLEMENT_PROCESSING,
  type SettlementCancelledPayload,
  type SettlementCompletedPayload,
  type SettlementFailedPayload,
  type SettlementInitiatedPayload,
  type SettlementProcessingPayload,
} from "./settlement.events.js";
import type { IsoTimestamp } from "@veritas/core";

/** Lifecycle status of a settlement aggregate (distinct from the persistence-layer SettlementStatus). */
export type AggregateSettlementStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface SettlementState {
  readonly settlementId: string;
  readonly orderId: string;
  readonly payerId: string;
  readonly payeeId: string;
  readonly amountUsdc: bigint;
  readonly currency: string;
  readonly status: AggregateSettlementStatus;
  readonly transactionId: string | null;
  readonly txHash: string | null;
  readonly failureReason: string | null;
  readonly initiatedAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
  readonly metadata: Record<string, unknown>;
}

export interface InitiateSettlementParams {
  readonly settlementId: string;
  readonly orderId: string;
  readonly payerId: string;
  readonly payeeId: string;
  readonly amountUsdc: bigint;
  readonly currency: string;
  readonly metadata?: Record<string, unknown>;
}

export class SettlementAggregate extends AggregateRoot {
  readonly aggregateType = "Settlement";

  private _state: SettlementState | null = null;

  get id(): string {
    return this._state?.settlementId ?? "";
  }

  get state(): SettlementState {
    if (!this._state) throw new Error("Settlement not initialized");
    return this._state;
  }

  get status(): AggregateSettlementStatus {
    return this.state.status;
  }

  static initiate(params: InitiateSettlementParams): SettlementAggregate {
    const agg = new SettlementAggregate();
    const now = epochToIso(Date.now());
    const payload: SettlementInitiatedPayload = {
      settlementId: params.settlementId,
      orderId: params.orderId,
      payerId: params.payerId,
      payeeId: params.payeeId,
      amountUsdc: params.amountUsdc,
      currency: params.currency,
      initiatedAt: now,
      metadata: params.metadata ?? {},
    };
    agg.raise(SETTLEMENT_INITIATED, payload);
    return agg;
  }

  markProcessing(transactionId: string): void {
    if (this.status !== "pending") {
      throw new Error(`Cannot mark processing from status: ${this.status}`);
    }
    const payload: SettlementProcessingPayload = {
      settlementId: this.state.settlementId,
      transactionId,
      processingAt: epochToIso(Date.now()),
    };
    this.raise(SETTLEMENT_PROCESSING, payload);
  }

  complete(transactionId: string, txHash: string | null): void {
    if (this.status !== "processing") {
      throw new Error(`Cannot complete from status: ${this.status}`);
    }
    const payload: SettlementCompletedPayload = {
      settlementId: this.state.settlementId,
      transactionId,
      txHash,
      completedAt: epochToIso(Date.now()),
    };
    this.raise(SETTLEMENT_COMPLETED, payload);
  }

  fail(reason: string): void {
    if (this.status !== "processing" && this.status !== "pending") {
      throw new Error(`Cannot fail from status: ${this.status}`);
    }
    const payload: SettlementFailedPayload = {
      settlementId: this.state.settlementId,
      reason,
      failedAt: epochToIso(Date.now()),
    };
    this.raise(SETTLEMENT_FAILED, payload);
  }

  cancel(reason: string | null = null): void {
    if (this.status !== "pending") {
      throw new Error(`Cannot cancel from status: ${this.status}`);
    }
    const payload: SettlementCancelledPayload = {
      settlementId: this.state.settlementId,
      reason,
      cancelledAt: epochToIso(Date.now()),
    };
    this.raise(SETTLEMENT_CANCELLED, payload);
  }

  apply(event: StoredEvent): void {
    switch (event.eventType) {
      case SETTLEMENT_INITIATED: {
        const p = event.payload as SettlementInitiatedPayload;
        this._state = {
          settlementId: p.settlementId,
          orderId: p.orderId,
          payerId: p.payerId,
          payeeId: p.payeeId,
          amountUsdc: p.amountUsdc,
          currency: p.currency,
          status: "pending",
          transactionId: null,
          txHash: null,
          failureReason: null,
          initiatedAt: p.initiatedAt,
          updatedAt: p.initiatedAt,
          metadata: p.metadata,
        };
        break;
      }
      case SETTLEMENT_PROCESSING: {
        if (!this._state) break;
        const p = event.payload as SettlementProcessingPayload;
        this._state = {
          ...this._state,
          status: "processing",
          transactionId: p.transactionId,
          updatedAt: p.processingAt,
        };
        break;
      }
      case SETTLEMENT_COMPLETED: {
        if (!this._state) break;
        const p = event.payload as SettlementCompletedPayload;
        this._state = {
          ...this._state,
          status: "completed",
          transactionId: p.transactionId,
          txHash: p.txHash,
          updatedAt: p.completedAt,
        };
        break;
      }
      case SETTLEMENT_FAILED: {
        if (!this._state) break;
        const p = event.payload as SettlementFailedPayload;
        this._state = {
          ...this._state,
          status: "failed",
          failureReason: p.reason,
          updatedAt: p.failedAt,
        };
        break;
      }
      case SETTLEMENT_CANCELLED: {
        if (!this._state) break;
        const p = event.payload as SettlementCancelledPayload;
        this._state = {
          ...this._state,
          status: "cancelled",
          failureReason: p.reason,
          updatedAt: p.cancelledAt,
        };
        break;
      }
    }
  }
}
