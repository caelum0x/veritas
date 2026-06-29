// Domain events for the Settlement aggregate.
import type { IsoTimestamp } from "@veritas/core";
import type { SettlementStatus } from "@veritas/contracts";

export const SETTLEMENT_INITIATED = "settlement.initiated" as const;
export const SETTLEMENT_PROCESSING = "settlement.processing" as const;
export const SETTLEMENT_COMPLETED = "settlement.completed" as const;
export const SETTLEMENT_FAILED = "settlement.failed" as const;
export const SETTLEMENT_CANCELLED = "settlement.cancelled" as const;

export interface SettlementInitiatedPayload {
  readonly settlementId: string;
  readonly orderId: string;
  readonly payerId: string;
  readonly payeeId: string;
  readonly amountUsdc: bigint;
  readonly currency: string;
  readonly initiatedAt: IsoTimestamp;
  readonly metadata: Record<string, unknown>;
}

export interface SettlementProcessingPayload {
  readonly settlementId: string;
  readonly transactionId: string;
  readonly processingAt: IsoTimestamp;
}

export interface SettlementCompletedPayload {
  readonly settlementId: string;
  readonly transactionId: string;
  readonly txHash: string | null;
  readonly completedAt: IsoTimestamp;
}

export interface SettlementFailedPayload {
  readonly settlementId: string;
  readonly reason: string;
  readonly failedAt: IsoTimestamp;
}

export interface SettlementCancelledPayload {
  readonly settlementId: string;
  readonly reason: string | null;
  readonly cancelledAt: IsoTimestamp;
}

export type SettlementEventPayload =
  | SettlementInitiatedPayload
  | SettlementProcessingPayload
  | SettlementCompletedPayload
  | SettlementFailedPayload
  | SettlementCancelledPayload;
