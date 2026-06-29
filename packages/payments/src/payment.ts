// Payment entity: represents a payment record for an order with lifecycle status.

import { z } from "zod";
import { type Id, newId } from "@veritas/core";
import type { Money } from "@veritas/contracts";

/** Prefixed payment identifier. */
export type PaymentId = Id<"pay">;
export const newPaymentId = (): PaymentId => newId("pay");

/** All possible states a payment can be in. */
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

/** Full payment record stored in the payment repository. */
export const PaymentSchema = z.object({
  id: z.string().startsWith("pay_"),
  orderId: z.string().startsWith("order_"),
  walletId: z.string().startsWith("wlt_"),
  amount: z.object({ currency: z.literal("USDC"), amount: z.string() }),
  fee: z.object({ currency: z.literal("USDC"), amount: z.string() }),
  status: PaymentStatusSchema,
  processorRef: z.string().nullable(),
  failureReason: z.string().nullable(),
  idempotencyKey: z.string().nullable(),
  refundedAmount: z.object({ currency: z.literal("USDC"), amount: z.string() }).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Payment = z.infer<typeof PaymentSchema>;

/** Minimal data needed to create a new payment. */
export interface CreatePaymentInput {
  readonly orderId: string;
  readonly walletId: string;
  readonly amount: Money;
  readonly fee: Money;
  readonly idempotencyKey?: string;
}

/** Build a new payment in PENDING state. */
export function makePayment(
  input: CreatePaymentInput,
  now: string
): Payment {
  const zeroMoney: Money = { currency: "USDC", amount: "0" };
  return {
    id: newPaymentId(),
    orderId: input.orderId,
    walletId: input.walletId,
    amount: input.amount,
    fee: input.fee,
    status: "PENDING",
    processorRef: null,
    failureReason: null,
    idempotencyKey: input.idempotencyKey ?? null,
    refundedAmount: zeroMoney,
    createdAt: now,
    updatedAt: now,
  };
}

/** Produce an updated payment with new status and optional fields. */
export function updatePaymentStatus(
  payment: Payment,
  status: PaymentStatus,
  fields: {
    processorRef?: string;
    failureReason?: string;
    refundedAmount?: Money;
  },
  now: string
): Payment {
  return {
    ...payment,
    status,
    processorRef: fields.processorRef ?? payment.processorRef,
    failureReason: fields.failureReason ?? payment.failureReason,
    refundedAmount: fields.refundedAmount ?? payment.refundedAmount,
    updatedAt: now,
  };
}
