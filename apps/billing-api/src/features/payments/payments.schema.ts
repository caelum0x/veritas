// Zod request/response schemas for the payments feature endpoints.

import { z } from "zod";

const MoneySchema = z.object({
  currency: z.literal("USDC"),
  amount: z.string().regex(/^\d+$/, "Must be a non-negative integer string"),
});

export const ChargeBodySchema = z.object({
  orderId: z.string().min(1),
  organizationId: z.string().min(1),
  walletId: z.string().min(1),
  fromWalletAddress: z.string().min(1),
  toWalletAddress: z.string().min(1),
  amount: MoneySchema,
  idempotencyKey: z.string().min(1),
  metadata: z.record(z.string()).optional(),
});
export type ChargeBody = z.infer<typeof ChargeBodySchema>;

export const RefundBodySchema = z.object({
  paymentId: z.string().min(1),
  amount: MoneySchema,
  reason: z.string().optional(),
});
export type RefundBody = z.infer<typeof RefundBodySchema>;

export const ListPaymentsQuerySchema = z.object({
  organizationId: z.string().min(1),
});
export type ListPaymentsQuery = z.infer<typeof ListPaymentsQuerySchema>;

export const PaymentResponseSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  organizationId: z.string(),
  processorId: z.string(),
  processorRef: z.string().nullable(),
  status: z.enum([
    "PENDING",
    "PROCESSING",
    "SUCCEEDED",
    "FAILED",
    "REFUNDED",
    "PARTIALLY_REFUNDED",
    "CANCELLED",
  ]),
  amount: MoneySchema,
  fee: MoneySchema,
  net: MoneySchema,
  idempotencyKey: z.string().nullable(),
  failureReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PaymentResponse = z.infer<typeof PaymentResponseSchema>;

export const RefundResponseSchema = z.object({
  paymentId: z.string(),
  refundRef: z.string(),
  status: z.string(),
});
export type RefundResponse = z.infer<typeof RefundResponseSchema>;
