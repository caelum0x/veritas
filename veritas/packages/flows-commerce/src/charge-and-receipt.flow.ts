// charge-and-receipt.flow.ts: charge payment -> post to ledger -> emit receipt event
import {
  ok,
  err,
  isErr,
  toAppError,
  type Result,
  type AppError,
  type Logger,
  type EventBus,
  epochToIso,
  newId,
  type Id,
} from "@veritas/core";
import type { Money } from "@veritas/contracts";
import { runCharge } from "@veritas/payments";
import type { PaymentProcessor, PaymentStore } from "@veritas/payments";
import { InMemoryLedger } from "@veritas/payments";
import type { LedgerAccountId } from "@veritas/payments";

export interface ChargeAndReceiptDeps {
  readonly processor: PaymentProcessor;
  readonly paymentStore: PaymentStore;
  readonly ledger: InMemoryLedger;
  readonly eventBus: EventBus;
  readonly logger: Logger;
}

export interface ChargeAndReceiptInput {
  readonly orderId: string;
  readonly organizationId: string;
  readonly fromWalletAddress: string;
  readonly toWalletAddress: string;
  readonly amount: Money;
  readonly idempotencyKey: string;
  readonly debitAccountId: LedgerAccountId;
  readonly creditAccountId: LedgerAccountId;
  readonly metadata?: Record<string, string>;
}

export interface ChargeAndReceiptOutput {
  readonly paymentId: string;
  readonly processorRef: string;
  readonly journalId: string;
  readonly amount: Money;
  readonly receiptIssuedAt: string;
}

/** Charge a payment, post a balanced ledger entry, and emit a receipt event. */
export async function chargeAndReceipt(
  input: ChargeAndReceiptInput,
  deps: ChargeAndReceiptDeps,
): Promise<Result<ChargeAndReceiptOutput, AppError>> {
  const {
    orderId,
    organizationId,
    fromWalletAddress,
    toWalletAddress,
    amount,
    idempotencyKey,
    debitAccountId,
    creditAccountId,
  } = input;
  const { processor, paymentStore, ledger, eventBus, logger } = deps;

  // Step 1: Run the charge via payment processor
  const chargeResult = await runCharge(
    {
      orderId,
      organizationId,
      processorId: processor.id,
      walletId: newId("wlt"),
      fromWalletAddress,
      toWalletAddress,
      amount,
      idempotencyKey,
      metadata: input.metadata,
    },
    processor,
    paymentStore,
  );

  if (isErr(chargeResult)) {
    logger.error("charge_and_receipt.charge_failed", { orderId, error: chargeResult.error });
    return err(toAppError(chargeResult.error));
  }

  const { payment, processorRef } = chargeResult.value;

  // Step 2: Post balanced journal entry to ledger
  const journal = ledger.post({
    description: `Charge for order ${orderId}`,
    referenceId: orderId,
    referenceType: "order",
    debitAccountId,
    creditAccountId,
    amount,
  });

  const receiptIssuedAt = epochToIso(Date.now());

  // Step 3: Emit receipt domain event
  await eventBus.publish({
    id: newId("evt"),
    type: "commerce.charge_and_receipt.issued",
    occurredAt: receiptIssuedAt,
    payload: {
      paymentId: payment.id as string,
      processorRef,
      journalId: journal.id,
      orderId,
      organizationId,
      amount,
    },
  } as Parameters<typeof eventBus.publish>[0]);

  logger.info("charge_and_receipt.completed", {
    paymentId: payment.id,
    processorRef,
    journalId: journal.id,
    orderId,
  });

  return ok({
    paymentId: payment.id as string,
    processorRef,
    journalId: journal.id,
    amount,
    receiptIssuedAt,
  });
}
