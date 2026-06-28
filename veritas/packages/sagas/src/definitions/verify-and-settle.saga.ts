// VerifyAndSettle saga: orchestrates claim verification followed by USDC settlement.
import { type Result, ok, err } from "@veritas/core";
import type { Logger } from "@veritas/observability";
import type { SagaContext } from "../context.js";
import type { SagaStep } from "../step.js";
import type { Saga } from "../saga.js";

export interface VerifyAndSettleInput {
  readonly orderId: string;
  readonly claimId: string;
  readonly buyerUserId: string;
  readonly sellerUserId: string;
  readonly amountUsdc: bigint;
}

export interface VerifyAndSettleOutput {
  readonly orderId: string;
  readonly verdict: string;
  readonly settlementId: string;
}

// Port interfaces — implementations injected at runtime.
export interface VerificationPort {
  runVerification(claimId: string, ctx: SagaContext): Promise<{ verdict: string; reportId: string }>;
  cancelVerification(claimId: string, ctx: SagaContext): Promise<void>;
}

export interface SettlementPort {
  holdFunds(orderId: string, amountUsdc: bigint, ctx: SagaContext): Promise<{ holdId: string }>;
  releaseHold(holdId: string, ctx: SagaContext): Promise<void>;
  settle(holdId: string, sellerUserId: string, ctx: SagaContext): Promise<{ settlementId: string }>;
}

export interface OrderStatusPort {
  markComplete(orderId: string, ctx: SagaContext): Promise<void>;
  markFailed(orderId: string, reason: string, ctx: SagaContext): Promise<void>;
}

export interface VerifyAndSettlePorts {
  readonly verification: VerificationPort;
  readonly settlement: SettlementPort;
  readonly orderStatus: OrderStatusPort;
}

function holdFundsStep(ports: VerifyAndSettlePorts): SagaStep<VerifyAndSettleInput, { holdId: string }> {
  return {
    name: "holdFunds",
    async execute(input, ctx) {
      const result = await ports.settlement.holdFunds(input.orderId, input.amountUsdc, ctx);
      return ok(result);
    },
    async compensate(input, ctx) {
      const holdId = ctx.data["holdId"] as string | undefined;
      if (holdId) {
        await ports.settlement.releaseHold(holdId, ctx);
      }
    },
  };
}

function runVerificationStep(ports: VerifyAndSettlePorts): SagaStep<VerifyAndSettleInput, { verdict: string; reportId: string }> {
  return {
    name: "runVerification",
    async execute(input, ctx) {
      const result = await ports.verification.runVerification(input.claimId, ctx);
      return ok(result);
    },
    async compensate(input, ctx) {
      await ports.verification.cancelVerification(input.claimId, ctx);
    },
  };
}

function settlePaymentStep(ports: VerifyAndSettlePorts): SagaStep<VerifyAndSettleInput, { settlementId: string }> {
  return {
    name: "settlePayment",
    async execute(input, ctx) {
      const holdId = ctx.data["holdId"] as string | undefined;
      if (!holdId) return err(new Error("holdId missing from context"));
      const result = await ports.settlement.settle(holdId, input.sellerUserId, ctx);
      return ok(result);
    },
    async compensate(input, ctx) {
      const holdId = ctx.data["holdId"] as string | undefined;
      if (holdId) {
        await ports.settlement.releaseHold(holdId, ctx);
      }
    },
  };
}

function markOrderCompleteStep(ports: VerifyAndSettlePorts): SagaStep<VerifyAndSettleInput, Record<string, never>> {
  return {
    name: "markOrderComplete",
    async execute(input, ctx): Promise<Result<Record<string, never>>> {
      await ports.orderStatus.markComplete(input.orderId, ctx);
      return ok({} as Record<string, never>);
    },
    async compensate(input, ctx) {
      const reason = (ctx.data["compensationReason"] as string | undefined) ?? "saga compensated";
      await ports.orderStatus.markFailed(input.orderId, reason, ctx);
    },
  };
}

export function verifyAndSettleSaga(ports: VerifyAndSettlePorts): Saga<VerifyAndSettleInput, VerifyAndSettleOutput> {
  return {
    name: "VerifyAndSettle",
    steps: [
      holdFundsStep(ports),
      runVerificationStep(ports),
      settlePaymentStep(ports),
      markOrderCompleteStep(ports),
    ],
    buildOutput(input, data): Result<VerifyAndSettleOutput> {
      const settlementId = data["settlementId"] as string | undefined;
      const verdict = data["verdict"] as string | undefined;
      if (!settlementId || !verdict) {
        return err(new Error("Missing settlementId or verdict in saga output"));
      }
      return ok({ orderId: input.orderId, verdict, settlementId });
    },
  };
}
