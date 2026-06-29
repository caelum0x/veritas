// charge flow: orchestrate the full charge lifecycle for a payment.

import { ok, err, isOk, isErr, type Result, ValidationError, type Id } from "@veritas/core";
import { Usdc } from "@veritas/core";
import type { Money } from "@veritas/contracts";
import type { Payment } from "./types.js";
import type { PaymentProcessor } from "./processor.js";
import type { PaymentStore } from "./store.js";
import { computeFee } from "./fee.js";

/** Input to initiate a charge against an order. */
export interface ChargeInput {
  readonly orderId: string;
  readonly organizationId: string;
  readonly processorId: string;
  readonly walletId: string;
  readonly fromWalletAddress: string;
  readonly toWalletAddress: string;
  readonly amount: Money;
  readonly idempotencyKey: string;
  readonly metadata?: Record<string, string>;
}

/** Output on successful charge. */
export interface ChargeOutput {
  readonly payment: Payment;
  readonly processorRef: string;
}

/** Run the full charge flow: idempotency check → create payment → processor charge → persist result. */
export async function runCharge(
  input: ChargeInput,
  processor: PaymentProcessor,
  store: PaymentStore,
): Promise<Result<ChargeOutput>> {
  // Validate amount is positive
  const amountUnits = BigInt(input.amount.amount);
  if (amountUnits <= 0n) {
    return err(new ValidationError({ message: "Charge amount must be positive" }));
  }

  // Idempotency: return existing payment for duplicate keys
  const existingResult = await store.findPaymentByOrderId(input.orderId as Id<string>);
  if (isOk(existingResult) && existingResult.value !== null) {
    const existing = existingResult.value;
    if (
      existing.idempotencyKey === input.idempotencyKey &&
      existing.status === "SUCCEEDED" &&
      existing.processorRef !== null
    ) {
      return ok({ payment: existing, processorRef: existing.processorRef });
    }
  }

  // Compute platform fee
  const grossUsdc = Usdc.fromBaseUnits(amountUnits);
  const feeBreakdown = computeFee(grossUsdc);
  const fee: Money = { currency: "USDC", amount: feeBreakdown.totalFee.baseUnits.toString() };
  const net: Money = { currency: "USDC", amount: feeBreakdown.net.baseUnits.toString() };

  // Persist initial PENDING payment
  const createResult = await store.createPayment({
    orderId: input.orderId as Id<string>,
    organizationId: input.organizationId as Id<string>,
    processorId: input.processorId,
    amount: input.amount,
    fee,
    net,
    idempotencyKey: input.idempotencyKey,
    metadata: input.metadata,
  });
  if (isErr(createResult)) return err(createResult.error);
  const payment = createResult.value;

  // Transition to PROCESSING
  const processingResult = await store.updatePayment(payment.id, { status: "PROCESSING" });
  if (isErr(processingResult)) return err(processingResult.error);
  const processingPayment = processingResult.value;

  // Execute charge via processor port
  const chargeResult = await processor.charge({
    paymentId: payment.id as string,
    fromWalletAddress: input.fromWalletAddress,
    toWalletAddress: input.toWalletAddress,
    amount: input.amount,
    idempotencyKey: input.idempotencyKey,
    metadata: input.metadata,
  });

  if (isErr(chargeResult)) {
    // Persist failure
    await store.updatePayment(processingPayment.id, {
      status: "FAILED",
      failureReason: String(chargeResult.error),
    });
    return err(chargeResult.error);
  }

  const { processorRef, status } = chargeResult.value;
  const finalStatus = status === "SUCCEEDED" ? "SUCCEEDED" : "PROCESSING";
  const finalResult = await store.updatePayment(processingPayment.id, {
    status: finalStatus,
    processorRef,
  });
  if (isErr(finalResult)) return err(finalResult.error);

  return ok({ payment: finalResult.value, processorRef });
}
