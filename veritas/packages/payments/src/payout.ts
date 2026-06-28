// payout flow: disburse provider earnings from a settled payment to their wallet.

import { ok, err, isErr, type Result, ValidationError, type Id } from "@veritas/core";
import type { Money } from "@veritas/contracts";
import type { PaymentProcessor } from "./processor.js";
import type { PaymentStore } from "./store.js";

/** Input for a provider payout. */
export interface PayoutInput {
  readonly paymentId: string;
  readonly toWalletAddress: string;
  readonly idempotencyKey: string;
}

/** Output on successful payout. */
export interface PayoutOutput {
  readonly payoutRef: string;
  readonly netAmount: Money;
}

/** Run the payout flow: verify payment succeeded → compute net (amount minus fee) → disburse. */
export async function runPayout(
  input: PayoutInput,
  processor: PaymentProcessor,
  store: PaymentStore,
): Promise<Result<PayoutOutput>> {
  // Load payment
  const loadResult = await store.findPaymentById(input.paymentId as Id<string>);
  if (isErr(loadResult)) return err(loadResult.error);
  const payment = loadResult.value;

  // Only succeeded payments can be paid out
  if (payment.status !== "SUCCEEDED") {
    return err(
      new ValidationError({
        message: `Cannot pay out a payment in status ${payment.status}`,
      })
    );
  }

  // Net amount = charged amount minus platform fee
  const grossUnits = BigInt(payment.amount.amount);
  const feeUnits = BigInt(payment.fee.amount);
  const netUnits = grossUnits - feeUnits;
  if (netUnits <= 0n) {
    return err(new ValidationError({ message: "Net payout amount must be positive after fee deduction" }));
  }
  const netAmount: Money = { currency: "USDC", amount: String(netUnits) };

  // Dispatch payout via processor
  const payoutResult = await processor.payout({
    paymentId: payment.id as string,
    toWalletAddress: input.toWalletAddress,
    amount: netAmount,
    idempotencyKey: input.idempotencyKey,
  });
  if (isErr(payoutResult)) return err(payoutResult.error);

  return ok({ payoutRef: payoutResult.value.payoutRef, netAmount });
}
