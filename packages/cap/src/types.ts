// Internal CAP types for the Veritas agent protocol integration.

import type { VerificationReport } from "@veritas/contracts";
import type { OrderId, UserId, IsoTimestamp } from "@veritas/core";

/** Parsed and validated requirements extracted from a CAP negotiation. */
export interface ParsedRequirements {
  readonly text: string;
  readonly claims?: readonly string[];
  readonly effort: "low" | "standard" | "high";
  readonly maxClaims?: number;
  readonly webhookUrl?: string;
  readonly callbackOrderId?: string;
}

/** An in-flight order tracked by the pending store. */
export interface PendingOrder {
  readonly orderId: OrderId;
  readonly buyerId: UserId;
  readonly requirements: ParsedRequirements;
  readonly createdAt: IsoTimestamp;
  readonly amountUsdc: string;
}

/** CAP provider configuration supplied at startup. */
export interface CapProviderConfig {
  readonly agentUrl: string;
  readonly agentId: string;
  readonly privateKey: string;
  readonly walletAddress: string;
  readonly networkId: string;
  readonly maxReconnectAttempts?: number;
  readonly reconnectBaseDelayMs?: number;
}

/** Deliverable payload sent back to the buyer on order completion. */
export interface VeritasDeliverable {
  readonly schema: "veritas/verification-report@1";
  readonly report: VerificationReport;
  readonly generatedAt: IsoTimestamp;
  readonly durationMs: number;
}

/** Counters tracked by the CAP metrics module. */
export interface CapMetricsSnapshot {
  readonly negotiationsReceived: number;
  readonly negotiationsAccepted: number;
  readonly negotiationsRejected: number;
  readonly ordersReceived: number;
  readonly ordersCompleted: number;
  readonly ordersFailed: number;
  readonly ordersExpired: number;
  readonly verificationsStarted: number;
  readonly verificationsSucceeded: number;
  readonly verificationsFailed: number;
  readonly deliveriesSent: number;
  readonly deliveriesFailed: number;
  readonly reconnectAttempts: number;
  readonly totalUsdcEarned: bigint;
}
