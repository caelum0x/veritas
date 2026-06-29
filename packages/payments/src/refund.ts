// refund flow: orchestrate partial or full refund of a succeeded payment.

import { ok, err, isErr, type Result, ValidationError, type Id } from "@veritas/core";
import type { Money } from "@veritas/contracts";
import type { PaymentProcessor } from "./processor.js";
import type { PaymentStore } from "./store.js";
import type { Payment } from "./types.js";

/** Input for a refund request against an existing payment. */
export interface RefundInput {
  readonly paymentId: string;
  readonly amount: Money;
  readonly reason?: string;
}

/** Output on successful refund. */
export interface RefundOutput {
  readonly payment: Payment;
  readonly refundRef: string;
}

/** Run the refund flow: validate → processor refund → update payment status. */
export async function runRefund(
  input: RefundInput,
  processor: PaymentProcessor,
  store: PaymentStore,
): Promise<Result<RefundOutput>> {
  // Load payment
  const loadResult = await store.findPaymentById(input.paymentId as Id<string>);
  if (isErr(loadResult)) return err(loadResult.error);
  const payment = loadResult.value;

  // Only SUCCEEDED or PARTIALLY_REFUNDED payments can be refunded
  if (payment.status !== "SUCCEEDED" && payment.status !== "PARTIALLY_REFUNDED") {
    return err(
      new ValidationError({
        message: `Cannot refund a payment in status ${payment.status}`,
      })
    );
  }

  // Check processor ref exists
  if (payment.processorRef === null) {
    return err(new ValidationError({ message: "Payment has no processor reference" }));
  }

  // Validate refund amount is positive
  const refundUnits = BigInt(input.amount.amount);
  if (refundUnits <= 0n) {
    return err(new ValidationError({ message: "Refund amount must be positive" }));
  }

  // Validate refund does not exceed the original charge amount
  const charged = BigInt(payment.amount.amount);
  if (refundUnits > charged) {
    return err(
      new ValidationError({
        message: `Refund amount ${refundUnits} exceeds charged amount ${charged}`,
      })
    );
  }

  // Execute refund via processor
  const refundResult = await processor.refund({
    paymentId: payment.id as string,
    processorRef: payment.processorRef,
    amount: input.amount,
    reason: input.reason,
  });
  if (isErr(refundResult)) return err(refundResult.error);

  // Determine new status: full refund if refund equals charged amount
  const isFullRefund = refundUnits >= charged;
  const newStatus = isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED";

  const updateResult = await store.updatePayment(payment.id, { status: newStatus });
  if (isErr(updateResult)) return err(updateResult.error);

  return ok({ payment: updateResult.value, refundRef: refundResult.value.refundRef });
}
