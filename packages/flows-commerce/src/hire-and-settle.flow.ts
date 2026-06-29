// hire-and-settle.flow.ts: CAP order paid -> verify -> deliver -> settle -> meter usage
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
import type { Order, Settlement } from "@veritas/contracts";
import { handleOrderCompleted } from "@veritas/cap";
import { runCharge } from "@veritas/payments";
import type { PaymentProcessor, PaymentStore } from "@veritas/payments";
import { UsageMeter } from "@veritas/usage-billing";

export interface HireAndSettleDeps {
  readonly processor: PaymentProcessor;
  readonly paymentStore: PaymentStore;
  readonly usageMeter: UsageMeter;
  readonly eventBus: EventBus;
  readonly logger: Logger;
}

export interface HireAndSettleInput {
  readonly order: Order;
  readonly settlement: Settlement;
  readonly fromWalletAddress: string;
  readonly toWalletAddress: string;
  readonly idempotencyKey: string;
}

export interface HireAndSettleOutput {
  readonly orderId: string;
  readonly settlementId: string;
  readonly paymentId: string;
  readonly deliveredAt: string;
  readonly meteredAt: string;
}

/** Orchestrate CAP order: charge payment, handle delivery, log settlement, meter usage. */
export async function hireAndSettle(
  input: HireAndSettleInput,
  deps: HireAndSettleDeps,
): Promise<Result<HireAndSettleOutput, AppError>> {
  const { order, settlement, fromWalletAddress, toWalletAddress, idempotencyKey } = input;
  const { processor, paymentStore, usageMeter, eventBus, logger } = deps;

  // Step 1: Charge payment for the order
  const chargeResult = await runCharge(
    {
      orderId: order.id,
      organizationId: order.buyerAgentId,
      processorId: processor.id,
      walletId: newId("wlt"),
      fromWalletAddress,
      toWalletAddress,
      amount: settlement.amount,
      idempotencyKey,
    },
    processor,
    paymentStore,
  );
  if (isErr(chargeResult)) {
    logger.error("hire_and_settle.charge_failed", { orderId: order.id, error: chargeResult.error });
    return err(toAppError(chargeResult.error));
  }

  const deliveredAt = epochToIso(Date.now());

  // Step 2: Handle order completion and log settlement
  const completedResult = await handleOrderCompleted(
    { order, settlement, deliveredAt },
    logger,
  );
  if (isErr(completedResult)) {
    logger.error("hire_and_settle.completion_failed", { orderId: order.id });
    return err(completedResult.error);
  }

  // Step 3: Meter usage for the verification
  const meteredEvent = await usageMeter.record(
    order.buyerAgentId as ReturnType<typeof newId>,
    "VERIFICATIONS",
    1,
    { metadata: { orderId: order.id, settlementId: settlement.id } },
  );

  // Step 4: Emit domain event
  await eventBus.publish({
    id: newId("evt"),
    type: "commerce.hire_settled",
    occurredAt: deliveredAt,
    payload: {
      orderId: order.id,
      settlementId: settlement.id,
      paymentId: chargeResult.value.payment.id as string,
    },
  } as Parameters<typeof eventBus.publish>[0]);

  logger.info("hire_and_settle.completed", {
    orderId: order.id,
    paymentId: chargeResult.value.payment.id,
    usageEventId: meteredEvent.id,
  });

  return ok({
    orderId: order.id,
    settlementId: settlement.id,
    paymentId: chargeResult.value.payment.id as string,
    deliveredAt,
    meteredAt: meteredEvent.occurredAt,
  });
}
