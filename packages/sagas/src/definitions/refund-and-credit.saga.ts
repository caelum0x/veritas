// RefundAndCredit saga: reverses a completed order payment and issues a credit to the buyer wallet.
import { ok, err, type Result } from "@veritas/core";
import type { SagaStep } from "../step.js";
import type { SagaContext } from "../context.js";
import type { Saga } from "../saga.js";

// ---------------------------------------------------------------------------
// Port interfaces — modelled in-memory; swap for real adapters at composition.
// ---------------------------------------------------------------------------

export interface PaymentPort {
  /** Reverse the charge for the given order. Returns refund transaction id. */
  refundCharge(orderId: string, amountUsdc: bigint): Promise<Result<string, Error>>;
}

export interface WalletPort {
  /** Credit USDC to the buyer wallet. Returns credit transaction id. */
  creditWallet(walletId: string, amountUsdc: bigint, reason: string): Promise<Result<string, Error>>;
  /** Debit the credit previously issued (compensation). */
  debitWallet(walletId: string, amountUsdc: bigint, reason: string): Promise<Result<void, Error>>;
}

export interface OrderPort {
  /** Mark the order as refunded. */
  markRefunded(orderId: string, refundTxId: string): Promise<Result<void, Error>>;
  /** Revert the order status from refunded back to completed. */
  revertRefunded(orderId: string): Promise<Result<void, Error>>;
}

export interface NotificationPort {
  /** Notify the buyer that their refund has been processed. */
  notifyBuyer(userId: string, message: string): Promise<Result<void, Error>>;
}

// ---------------------------------------------------------------------------
// Input / output shapes.
// ---------------------------------------------------------------------------

export interface RefundAndCreditInput {
  readonly orderId: string;
  readonly buyerUserId: string;
  readonly buyerWalletId: string;
  readonly amountUsdc: bigint;
  readonly reason: string;
}

export interface RefundAndCreditOutput {
  readonly refundTxId: string;
  readonly creditTxId: string;
}

// ---------------------------------------------------------------------------
// In-memory console implementations (used when no real adapter is injected).
// ---------------------------------------------------------------------------

export const consolePaymentPort: PaymentPort = {
  async refundCharge(orderId, amountUsdc) {
    const txId = `refund_${orderId}_${Date.now()}`;
    console.info(`[PaymentPort] refunded ${amountUsdc} USDC for order ${orderId} → ${txId}`);
    return ok(txId);
  },
};

export const consoleWalletPort: WalletPort = {
  async creditWallet(walletId, amountUsdc, reason) {
    const txId = `credit_${walletId}_${Date.now()}`;
    console.info(`[WalletPort] credited ${amountUsdc} USDC to wallet ${walletId} (${reason}) → ${txId}`);
    return ok(txId);
  },
  async debitWallet(walletId, amountUsdc, reason) {
    console.info(`[WalletPort] debited ${amountUsdc} USDC from wallet ${walletId} (${reason}) [compensation]`);
    return ok(undefined);
  },
};

export const consoleOrderPort: OrderPort = {
  async markRefunded(orderId, refundTxId) {
    console.info(`[OrderPort] order ${orderId} marked refunded (${refundTxId})`);
    return ok(undefined);
  },
  async revertRefunded(orderId) {
    console.info(`[OrderPort] order ${orderId} reverted from refunded [compensation]`);
    return ok(undefined);
  },
};

export const consoleNotificationPort: NotificationPort = {
  async notifyBuyer(userId, message) {
    console.info(`[NotificationPort] notified buyer ${userId}: ${message}`);
    return ok(undefined);
  },
};

// ---------------------------------------------------------------------------
// Step factories.
// ---------------------------------------------------------------------------

function refundPaymentStep(payment: PaymentPort): SagaStep<RefundAndCreditInput, { refundTxId: string }> {
  return {
    name: "refund-payment",
    async execute(input, ctx): Promise<Result<{ refundTxId: string }>> {
      const result = await payment.refundCharge(input.orderId, input.amountUsdc);
      if (!result.ok) {
        ctx.logger.error("refund-payment: charge reversal failed", { err: result.error });
        return err(result.error as Error);
      }
      ctx.logger.info("refund-payment: charge reversed", { refundTxId: result.value });
      return ok({ refundTxId: result.value });
    },
    // No compensation needed — the refund itself is the corrective action.
  };
}

function markOrderRefundedStep(order: OrderPort): SagaStep<RefundAndCreditInput, Record<string, never>> {
  return {
    name: "mark-order-refunded",
    async execute(input, ctx): Promise<Result<Record<string, never>>> {
      const refundTxId = ctx.data["refundTxId"] as string;
      const result = await order.markRefunded(input.orderId, refundTxId);
      if (!result.ok) {
        ctx.logger.error("mark-order-refunded: failed", { err: result.error });
        return err(result.error as Error);
      }
      ctx.logger.info("mark-order-refunded: done", { orderId: input.orderId });
      return ok({} as Record<string, never>);
    },
    async compensate(input, ctx): Promise<void> {
      const result = await order.revertRefunded(input.orderId);
      if (!result.ok) {
        ctx.logger.error("mark-order-refunded: compensation failed", { err: result.error });
      }
    },
  };
}

function creditWalletStep(wallet: WalletPort): SagaStep<RefundAndCreditInput, { creditTxId: string }> {
  return {
    name: "credit-wallet",
    async execute(input, ctx): Promise<Result<{ creditTxId: string }>> {
      const reason = `Refund for order ${input.orderId}: ${input.reason}`;
      const result = await wallet.creditWallet(input.buyerWalletId, input.amountUsdc, reason);
      if (!result.ok) {
        ctx.logger.error("credit-wallet: failed", { err: result.error });
        return err(result.error as Error);
      }
      ctx.logger.info("credit-wallet: done", { creditTxId: result.value });
      return ok({ creditTxId: result.value });
    },
    async compensate(input, ctx): Promise<void> {
      const reason = `Compensation debit for order ${input.orderId} credit reversal`;
      const result = await wallet.debitWallet(input.buyerWalletId, input.amountUsdc, reason);
      if (!result.ok) {
        ctx.logger.error("credit-wallet: compensation failed", { err: result.error });
      }
    },
  };
}

function notifyBuyerStep(notification: NotificationPort): SagaStep<RefundAndCreditInput, Record<string, never>> {
  return {
    name: "notify-buyer",
    async execute(input, ctx): Promise<Result<Record<string, never>>> {
      const message =
        `Your refund of ${input.amountUsdc} USDC for order ${input.orderId} ` +
        `has been processed and credited to your wallet.`;
      const result = await notification.notifyBuyer(input.buyerUserId, message);
      if (!result.ok) {
        // Non-critical: log and continue rather than failing the saga.
        ctx.logger.warn("notify-buyer: notification delivery failed (non-fatal)", { err: result.error });
      } else {
        ctx.logger.info("notify-buyer: done", { userId: input.buyerUserId });
      }
      // Always succeed — notification failure must not roll back the refund.
      return ok({} as Record<string, never>);
    },
    // No compensation — notification side-effects are not reversible.
  };
}

// ---------------------------------------------------------------------------
// Public saga definition factory.
// ---------------------------------------------------------------------------

export const REFUND_AND_CREDIT_SAGA_NAME = "RefundAndCredit" as const;

export interface RefundAndCreditSagaDef extends Saga<RefundAndCreditInput, RefundAndCreditOutput> {
  readonly name: typeof REFUND_AND_CREDIT_SAGA_NAME;
}

export function createRefundAndCreditSaga(ports?: {
  payment?: PaymentPort;
  wallet?: WalletPort;
  order?: OrderPort;
  notification?: NotificationPort;
}): RefundAndCreditSagaDef {
  return {
    name: REFUND_AND_CREDIT_SAGA_NAME,
    steps: [
      refundPaymentStep(ports?.payment ?? consolePaymentPort),
      markOrderRefundedStep(ports?.order ?? consoleOrderPort),
      creditWalletStep(ports?.wallet ?? consoleWalletPort),
      notifyBuyerStep(ports?.notification ?? consoleNotificationPort),
    ],
    buildOutput(_input, data): Result<RefundAndCreditOutput> {
      const refundTxId = data["refundTxId"] as string | undefined;
      const creditTxId = data["creditTxId"] as string | undefined;
      if (!refundTxId || !creditTxId) {
        return err(new Error("Missing refundTxId or creditTxId in saga output"));
      }
      return ok({ refundTxId, creditTxId });
    },
  };
}
