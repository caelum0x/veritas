// refund-and-credit.flow.ts: refund payment -> post credit to ledger -> notify
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
} from "@veritas/core";
import type { Money } from "@veritas/contracts";
import { runRefund } from "@veritas/payments";
import type { PaymentProcessor, PaymentStore } from "@veritas/payments";
import { InMemoryLedger } from "@veritas/payments";
import type { LedgerAccountId } from "@veritas/payments";

export interface RefundAndCreditDeps {
  readonly processor: PaymentProcessor;
  readonly paymentStore: PaymentStore;
  readonly ledger: InMemoryLedger;
  readonly eventBus: EventBus;
  readonly logger: Logger;
}

export interface RefundAndCreditInput {
  readonly paymentId: string;
  readonly amount: Money;
  readonly reason?: string;
  readonly creditAccountId: LedgerAccountId;
  readonly debitAccountId: LedgerAccountId;
}

export interface RefundAndCreditOutput {
  readonly paymentId: string;
  readonly refundRef: string;
  readonly journalId: string;
  readonly amount: Money;
  readonly creditedAt: string;
}

/** Refund a payment, post a credit ledger entry, and emit a credit-issued event. */
export async function refundAndCredit(
  input: RefundAndCreditInput,
  deps: RefundAndCreditDeps,
): Promise<Result<RefundAndCreditOutput, AppError>> {
  const { paymentId, amount, reason, creditAccountId, debitAccountId } = input;
  const { processor, paymentStore, ledger, eventBus, logger } = deps;

  // Step 1: Execute the refund via payment processor
  const refundResult = await runRefund(
    { paymentId, amount, reason },
    processor,
    paymentStore,
  );

  if (isErr(refundResult)) {
    logger.error("refund_and_credit.refund_failed", { paymentId, error: refundResult.error });
    return err(toAppError(refundResult.error));
  }

  const { payment, refundRef } = refundResult.value;

  // Step 2: Post credit entry to ledger (debit revenue, credit liability)
  const journal = ledger.post({
    description: `Credit/refund for payment ${paymentId}${reason ? `: ${reason}` : ""}`,
    referenceId: paymentId,
    referenceType: "payment_refund",
    debitAccountId,
    creditAccountId,
    amount,
  });

  const creditedAt = epochToIso(Date.now());

  // Step 3: Emit notification event
  await eventBus.publish({
    id: newId("evt"),
    type: "commerce.refund_and_credit.issued",
    occurredAt: creditedAt,
    payload: {
      paymentId: payment.id as string,
      refundRef,
      journalId: journal.id,
      amount,
      reason: reason ?? null,
    },
  } as Parameters<typeof eventBus.publish>[0]);

  logger.info("refund_and_credit.completed", {
    paymentId: payment.id,
    refundRef,
    journalId: journal.id,
  });

  return ok({
    paymentId: payment.id as string,
    refundRef,
    journalId: journal.id,
    amount,
    creditedAt,
  });
}
