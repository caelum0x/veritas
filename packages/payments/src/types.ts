// Core domain types for the payments module: Payment, PaymentStatus, Refund, Payout.

import { z } from "zod";
import { type IsoTimestamp, type Id } from "@veritas/core";
import type { Money } from "@veritas/contracts";

export const PaymentStatusSchema = z.enum([
  "PENDING",
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "CANCELLED",
]);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const PayoutStatusSchema = z.enum([
  "PENDING",
  "IN_TRANSIT",
  "PAID",
  "FAILED",
  "CANCELLED",
]);
export type PayoutStatus = z.infer<typeof PayoutStatusSchema>;

export interface Payment {
  readonly id: Id<string>;
  readonly orderId: Id<string>;
  readonly organizationId: Id<string>;
  readonly processorId: string;
  readonly processorRef: string | null;
  readonly status: PaymentStatus;
  readonly amount: Money;
  readonly fee: Money;
  readonly net: Money;
  readonly idempotencyKey: string | null;
  readonly failureReason: string | null;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export interface CreatePaymentInput {
  readonly orderId: Id<string>;
  readonly organizationId: Id<string>;
  readonly processorId: string;
  readonly amount: Money;
  readonly fee: Money;
  readonly net: Money;
  readonly idempotencyKey?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface UpdatePaymentInput {
  readonly status?: PaymentStatus;
  readonly processorRef?: string;
  readonly failureReason?: string;
}

export interface Refund {
  readonly id: Id<string>;
  readonly paymentId: Id<string>;
  readonly processorRef: string | null;
  readonly amount: Money;
  readonly reason: string;
  readonly status: PaymentStatus;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export interface CreateRefundInput {
  readonly paymentId: Id<string>;
  readonly amount: Money;
  readonly reason: string;
}

export interface Payout {
  readonly id: Id<string>;
  readonly walletId: Id<string>;
  readonly processorId: string;
  readonly processorRef: string | null;
  readonly amount: Money;
  readonly status: PayoutStatus;
  readonly failureReason: string | null;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export interface CreatePayoutInput {
  readonly walletId: Id<string>;
  readonly processorId: string;
  readonly amount: Money;
}
