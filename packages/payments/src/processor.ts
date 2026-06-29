// PaymentProcessor port: interface that payment provider adapters must implement.

import type { Result } from "@veritas/core";
import type { Money } from "@veritas/contracts";

/** Request payload sent to a processor to initiate a charge. */
export interface ChargeRequest {
  readonly paymentId: string;
  readonly fromWalletAddress: string;
  readonly toWalletAddress: string;
  readonly amount: Money;
  readonly idempotencyKey: string;
  readonly metadata?: Record<string, string>;
}

/** Successful response from a processor charge. */
export interface ChargeResult {
  readonly processorRef: string;
  readonly status: "SUCCEEDED" | "PENDING";
  readonly confirmedAt: string | null;
}

/** Request payload for a refund. */
export interface RefundRequest {
  readonly paymentId: string;
  readonly processorRef: string;
  readonly amount: Money;
  readonly reason?: string;
}

/** Successful response from a processor refund. */
export interface RefundResult {
  readonly refundRef: string;
  readonly status: "SUCCEEDED" | "PENDING";
}

/** Request payload to initiate a payout to a provider/agent wallet. */
export interface PayoutRequest {
  readonly paymentId: string;
  readonly toWalletAddress: string;
  readonly amount: Money;
  readonly idempotencyKey: string;
}

/** Successful response from a payout. */
export interface PayoutResult {
  readonly payoutRef: string;
  readonly status: "SUCCEEDED" | "PENDING";
}

/** Port interface that every payment processor adapter must satisfy. */
export interface PaymentProcessor {
  /** Unique processor identifier (e.g. "usdc-onchain", "mock"). */
  readonly id: string;

  /** Charge a buyer's wallet for an order. */
  charge(request: ChargeRequest): Promise<Result<ChargeResult>>;

  /** Refund part or all of a previous charge. */
  refund(request: RefundRequest): Promise<Result<RefundResult>>;

  /** Pay out funds to a provider/agent wallet. */
  payout(request: PayoutRequest): Promise<Result<PayoutResult>>;
}
