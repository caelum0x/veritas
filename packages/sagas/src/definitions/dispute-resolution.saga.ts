// DisputeResolution saga: locks funds, runs arbitration, applies ruling, and releases escrow.
import { ok, err, type Result } from "@veritas/core";
import type { SagaContext } from "../context.js";
import type { SagaStep } from "../step.js";
import type { Saga } from "../saga.js";

export interface DisputeResolutionInput {
  readonly disputeId: string;
  readonly orderId: string;
  readonly buyerUserId: string;
  readonly sellerUserId: string;
  readonly amountUsdc: bigint;
}

export interface DisputeResolutionOutput {
  readonly disputeId: string;
  readonly ruling: "buyer_wins" | "seller_wins" | "split";
  readonly settlementId: string;
}

export interface EscrowPort {
  lockFunds(orderId: string, amountUsdc: bigint, ctx: SagaContext): Promise<{ escrowId: string }>;
  release(escrowId: string, recipientUserId: string, ctx: SagaContext): Promise<{ settlementId: string }>;
  refund(escrowId: string, buyerUserId: string, ctx: SagaContext): Promise<{ settlementId: string }>;
  split(escrowId: string, buyerUserId: string, sellerUserId: string, ctx: SagaContext): Promise<{ settlementId: string }>;
  unlock(escrowId: string, ctx: SagaContext): Promise<void>;
}

export interface ArbitrationPort {
  open(disputeId: string, orderId: string, ctx: SagaContext): Promise<{ arbitrationId: string }>;
  runArbitration(arbitrationId: string, ctx: SagaContext): Promise<{ ruling: "buyer_wins" | "seller_wins" | "split" }>;
  close(arbitrationId: string, ctx: SagaContext): Promise<void>;
}

export interface DisputeStatusPort {
  markResolved(disputeId: string, ruling: string, settlementId: string, ctx: SagaContext): Promise<void>;
  markFailed(disputeId: string, reason: string, ctx: SagaContext): Promise<void>;
}

export interface DisputeResolutionPorts {
  readonly escrow: EscrowPort;
  readonly arbitration: ArbitrationPort;
  readonly disputeStatus: DisputeStatusPort;
}

function lockEscrowStep(ports: DisputeResolutionPorts): SagaStep<DisputeResolutionInput, { escrowId: string }> {
  return {
    name: "lockEscrow",
    async execute(input, ctx) {
      const result = await ports.escrow.lockFunds(input.orderId, input.amountUsdc, ctx);
      return ok(result);
    },
    async compensate(input, ctx) {
      const escrowId = ctx.data["escrowId"] as string | undefined;
      if (escrowId) {
        await ports.escrow.unlock(escrowId, ctx);
      }
    },
  };
}

function openArbitrationStep(ports: DisputeResolutionPorts): SagaStep<DisputeResolutionInput, { arbitrationId: string }> {
  return {
    name: "openArbitration",
    async execute(input, ctx) {
      const result = await ports.arbitration.open(input.disputeId, input.orderId, ctx);
      return ok(result);
    },
    async compensate(input, ctx) {
      const arbitrationId = ctx.data["arbitrationId"] as string | undefined;
      if (arbitrationId) {
        await ports.arbitration.close(arbitrationId, ctx);
      }
    },
  };
}

function runArbitrationStep(ports: DisputeResolutionPorts): SagaStep<DisputeResolutionInput, { ruling: "buyer_wins" | "seller_wins" | "split" }> {
  return {
    name: "runArbitration",
    async execute(input, ctx) {
      const arbitrationId = ctx.data["arbitrationId"] as string | undefined;
      if (!arbitrationId) return err(new Error("arbitrationId missing from context"));
      const result = await ports.arbitration.runArbitration(arbitrationId, ctx);
      return ok(result);
    },
    async compensate(input, ctx) {
      const arbitrationId = ctx.data["arbitrationId"] as string | undefined;
      if (arbitrationId) {
        await ports.arbitration.close(arbitrationId, ctx);
      }
    },
  };
}

function applyRulingStep(ports: DisputeResolutionPorts): SagaStep<DisputeResolutionInput, { settlementId: string }> {
  return {
    name: "applyRuling",
    async execute(input, ctx) {
      const escrowId = ctx.data["escrowId"] as string | undefined;
      const ruling = ctx.data["ruling"] as "buyer_wins" | "seller_wins" | "split" | undefined;
      if (!escrowId || !ruling) {
        return err(new Error("escrowId or ruling missing from context"));
      }
      let result: { settlementId: string };
      if (ruling === "buyer_wins") {
        result = await ports.escrow.refund(escrowId, input.buyerUserId, ctx);
      } else if (ruling === "seller_wins") {
        result = await ports.escrow.release(escrowId, input.sellerUserId, ctx);
      } else {
        result = await ports.escrow.split(escrowId, input.buyerUserId, input.sellerUserId, ctx);
      }
      return ok(result);
    },
    async compensate(input, ctx) {
      const reason = (ctx.data["compensationReason"] as string | undefined) ?? "dispute saga compensated";
      await ports.disputeStatus.markFailed(input.disputeId, reason, ctx);
    },
  };
}

function markDisputeResolvedStep(ports: DisputeResolutionPorts): SagaStep<DisputeResolutionInput, Record<string, never>> {
  return {
    name: "markDisputeResolved",
    async execute(input, ctx): Promise<Result<Record<string, never>>> {
      const ruling = ctx.data["ruling"] as string | undefined;
      const settlementId = ctx.data["settlementId"] as string | undefined;
      if (!ruling || !settlementId) {
        return err(new Error("ruling or settlementId missing from context"));
      }
      await ports.disputeStatus.markResolved(input.disputeId, ruling, settlementId, ctx);
      return ok({} as Record<string, never>);
    },
    async compensate(input, ctx) {
      const reason = (ctx.data["compensationReason"] as string | undefined) ?? "dispute saga compensated";
      await ports.disputeStatus.markFailed(input.disputeId, reason, ctx);
    },
  };
}

export function disputeResolutionSaga(ports: DisputeResolutionPorts): Saga<DisputeResolutionInput, DisputeResolutionOutput> {
  return {
    name: "DisputeResolution",
    steps: [
      lockEscrowStep(ports),
      openArbitrationStep(ports),
      runArbitrationStep(ports),
      applyRulingStep(ports),
      markDisputeResolvedStep(ports),
    ],
    buildOutput(input, data): Result<DisputeResolutionOutput> {
      const ruling = data["ruling"] as "buyer_wins" | "seller_wins" | "split" | undefined;
      const settlementId = data["settlementId"] as string | undefined;
      if (!ruling || !settlementId) {
        return err(new Error("Incomplete output data for DisputeResolution saga"));
      }
      return ok({ disputeId: input.disputeId, ruling, settlementId });
    },
  };
}
