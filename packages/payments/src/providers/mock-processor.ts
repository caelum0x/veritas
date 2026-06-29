// Mock payment processor: deterministic in-memory impl for tests and local dev.

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

export interface MockProcessorOptions {
  /** When true, all charge calls return an error. */
  readonly failCharges?: boolean;
  /** When true, all refund calls return an error. */
  readonly failRefunds?: boolean;
  /** When true, all payout calls return an error. */
  readonly failPayouts?: boolean;
  /** When true, charges resolve as PENDING instead of SUCCEEDED. */
  readonly pendingMode?: boolean;
}

interface MockRecord {
  readonly ref: string;
  readonly kind: "CHARGE" | "REFUND" | "PAYOUT";
  readonly paymentId: string;
  readonly createdAt: string;
}

/** Deterministic mock that records all calls and supports configurable failure modes. */
export class MockProcessor implements PaymentProcessor {
  readonly id = "mock" as const;

  private readonly opts: MockProcessorOptions;
  private readonly callLog: MockRecord[] = [];

  constructor(opts: MockProcessorOptions = {}) {
    this.opts = opts;
  }

  async charge(req: ChargeRequest): Promise<Result<ChargeResult>> {
    if (this.opts.failCharges) {
      return err(new Error(`MockProcessor: charge intentionally failed for ${req.paymentId}`));
    }
    const processorRef = `mock_charge_${newId("chg")}`;
    const now = epochToIso(Date.now());
    this.callLog.push({ ref: processorRef, kind: "CHARGE", paymentId: req.paymentId, createdAt: now });
    const status = this.opts.pendingMode ? "PENDING" : "SUCCEEDED";
    return ok({
      processorRef,
      status,
      confirmedAt: status === "SUCCEEDED" ? now : null,
    });
  }

  async refund(req: RefundRequest): Promise<Result<RefundResult>> {
    if (this.opts.failRefunds) {
      return err(new Error(`MockProcessor: refund intentionally failed for ${req.paymentId}`));
    }
    const refundRef = `mock_refund_${newId("ref")}`;
    const now = epochToIso(Date.now());
    this.callLog.push({ ref: refundRef, kind: "REFUND", paymentId: req.paymentId, createdAt: now });
    return ok({ refundRef, status: "SUCCEEDED" });
  }

  async payout(req: PayoutRequest): Promise<Result<PayoutResult>> {
    if (this.opts.failPayouts) {
      return err(new Error(`MockProcessor: payout intentionally failed for ${req.paymentId}`));
    }
    const payoutRef = `mock_payout_${newId("pay")}`;
    const now = epochToIso(Date.now());
    this.callLog.push({ ref: payoutRef, kind: "PAYOUT", paymentId: req.paymentId, createdAt: now });
    return ok({ payoutRef, status: "SUCCEEDED" });
  }

  /** Return an immutable snapshot of all recorded calls. */
  getCalls(): readonly MockRecord[] {
    return [...this.callLog];
  }

  /** Return calls filtered by kind. */
  getCallsByKind(kind: MockRecord["kind"]): readonly MockRecord[] {
    return this.callLog.filter((r) => r.kind === kind);
  }

  /** Reset call log (for test isolation). */
  reset(): void {
    this.callLog.length = 0;
  }
}
