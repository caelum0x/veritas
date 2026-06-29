// USDC on-chain settlement processor: console-logged port impl (no real on-chain calls).

import { ok, err, epochToIso, newId } from "@veritas/core";
import type { Result } from "@veritas/core";
import type {
  PaymentProcessor,
  ChargeRequest,
  ChargeResult,
  RefundRequest,
  RefundResult,
  PayoutRequest,
  PayoutResult,
} from "../processor.js";

export interface UsdcOnChainConfig {
  readonly platformWalletAddress: string;
  readonly chain: "base";
  readonly confirmationBlocks: number;
}

interface SettlementRecord {
  readonly txHash: string;
  readonly fromAddress: string;
  readonly toAddress: string;
  readonly amountStr: string;
  readonly submittedAt: string;
  status: "SUBMITTED" | "CONFIRMED" | "FAILED";
  blockNumber: number | null;
  confirmedAt: string | null;
}

/**
 * Port implementation of PaymentProcessor using USDC on Base.
 * Simulates on-chain behavior in-memory; swap internals for real SDK calls.
 */
export class UsdcOnChainProcessor implements PaymentProcessor {
  readonly id = "usdc-onchain" as const;

  private readonly config: UsdcOnChainConfig;
  private readonly records: Map<string, SettlementRecord> = new Map();
  private simulatedBlock = 10_000;

  constructor(config: UsdcOnChainConfig) {
    this.config = config;
  }

  async charge(req: ChargeRequest): Promise<Result<ChargeResult>> {
    const txHash = `0x${newId("tx").replace(/[^a-f0-9]/gi, "a").padEnd(64, "0").slice(0, 64)}`;
    const submittedAt = epochToIso(Date.now());

    const record: SettlementRecord = {
      txHash,
      fromAddress: req.fromWalletAddress,
      toAddress: req.toWalletAddress,
      amountStr: req.amount.amount,
      submittedAt,
      status: "SUBMITTED",
      blockNumber: null,
      confirmedAt: null,
    };
    this.records.set(txHash, record);
    console.log(
      `[usdc-onchain] SUBMITTED paymentId=${req.paymentId} txHash=${txHash} amount=${req.amount.amount}`,
    );

    // Simulate block confirmation synchronously in the in-memory impl.
    this.simulatedBlock += this.config.confirmationBlocks;
    record.status = "CONFIRMED";
    record.blockNumber = this.simulatedBlock;
    record.confirmedAt = epochToIso(Date.now());

    console.log(`[usdc-onchain] CONFIRMED txHash=${txHash} block=${this.simulatedBlock}`);

    return ok({
      processorRef: txHash,
      status: "SUCCEEDED",
      confirmedAt: record.confirmedAt,
    });
  }

  async refund(req: RefundRequest): Promise<Result<RefundResult>> {
    const original = this.records.get(req.processorRef);
    if (!original) {
      return err(new Error(`Settlement not found: ${req.processorRef}`));
    }
    if (original.status !== "CONFIRMED") {
      return err(new Error(`Cannot refund unconfirmed settlement: ${req.processorRef}`));
    }

    const refundHash = `0x${newId("rtx").replace(/[^a-f0-9]/gi, "b").padEnd(64, "0").slice(0, 64)}`;
    console.log(
      `[usdc-onchain] REFUND paymentId=${req.paymentId} refundHash=${refundHash} originalTx=${req.processorRef}`,
    );

    return ok({ refundRef: refundHash, status: "SUCCEEDED" });
  }

  async payout(req: PayoutRequest): Promise<Result<PayoutResult>> {
    const txHash = `0x${newId("ptx").replace(/[^a-f0-9]/gi, "c").padEnd(64, "0").slice(0, 64)}`;
    this.simulatedBlock += 1;
    console.log(
      `[usdc-onchain] PAYOUT paymentId=${req.paymentId} txHash=${txHash} to=${req.toWalletAddress} amount=${req.amount.amount}`,
    );
    return ok({ payoutRef: txHash, status: "SUCCEEDED" });
  }

  /** Read back a settlement record by its tx hash (useful for reconciliation). */
  getRecord(txHash: string): Readonly<SettlementRecord> | undefined {
    return this.records.get(txHash);
  }
}
