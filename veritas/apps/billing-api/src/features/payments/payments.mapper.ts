// Maps @veritas/payments domain objects to HTTP response shapes.

import type { Payment } from "@veritas/payments";
import type { PaymentResponse, RefundResponse } from "./payments.schema.js";

export function toPaymentResponse(payment: Payment): PaymentResponse {
  return {
    id: payment.id as string,
    orderId: payment.orderId as string,
    organizationId: payment.organizationId as string,
    processorId: payment.processorId,
    processorRef: payment.processorRef,
    status: payment.status,
    amount: payment.amount,
    fee: payment.fee,
    net: payment.net,
    idempotencyKey: payment.idempotencyKey,
    failureReason: payment.failureReason,
    createdAt: payment.createdAt as string,
    updatedAt: payment.updatedAt as string,
  };
}

export function toRefundResponse(
  paymentId: string,
  refundRef: string,
  status: string,
): RefundResponse {
  return { paymentId, refundRef, status };
}
