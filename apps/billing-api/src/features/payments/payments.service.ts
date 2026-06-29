// Payments service: orchestrates charge and refund flows via @veritas/payments package flows.

import { isErr, ok, AppError, type Result, type Id } from "@veritas/core";
import { runCharge, runRefund } from "@veritas/payments";
import type { Payment } from "@veritas/payments";
import type { Deps } from "../../container.js";
import type { ChargeBody, RefundBody } from "./payments.schema.js";

export interface ChargeResult {
  readonly payment: Payment;
  readonly processorRef: string;
}

export interface RefundResult {
  readonly payment: Payment;
  readonly refundRef: string;
}

export interface ListPaymentsResult {
  readonly payments: readonly Payment[];
}

export class PaymentsService {
  constructor(private readonly deps: Deps) {}

  async charge(body: ChargeBody): Promise<Result<ChargeResult>> {
    const result = await runCharge(
      {
        orderId: body.orderId,
        organizationId: body.organizationId,
        processorId: this.deps.paymentProcessor.id,
        walletId: body.walletId,
        fromWalletAddress: body.fromWalletAddress,
        toWalletAddress: body.toWalletAddress,
        amount: body.amount,
        idempotencyKey: body.idempotencyKey,
        metadata: body.metadata,
      },
      this.deps.paymentProcessor,
      this.deps.paymentStore,
    );

    if (isErr(result)) {
      this.deps.logger.warn("payments_service.charge_failed", {
        orderId: body.orderId,
        error: (result.error as AppError).message,
      });
    } else {
      this.deps.logger.info("payments_service.charge_succeeded", {
        paymentId: result.value.payment.id as string,
        orderId: body.orderId,
        processorRef: result.value.processorRef,
      });
    }

    return result;
  }

  async refund(body: RefundBody): Promise<Result<RefundResult>> {
    const result = await runRefund(
      {
        paymentId: body.paymentId,
        amount: body.amount,
        reason: body.reason,
      },
      this.deps.paymentProcessor,
      this.deps.paymentStore,
    );

    if (isErr(result)) {
      this.deps.logger.warn("payments_service.refund_failed", {
        paymentId: body.paymentId,
        error: (result.error as AppError).message,
      });
    } else {
      this.deps.logger.info("payments_service.refund_succeeded", {
        paymentId: body.paymentId,
        refundRef: result.value.refundRef,
      });
    }

    return result;
  }

  async listByOrg(organizationId: string): Promise<Result<ListPaymentsResult>> {
    const result = await this.deps.paymentStore.listPaymentsByOrg(
      organizationId as Id<string>,
    );

    if (isErr(result)) {
      this.deps.logger.warn("payments_service.list_failed", {
        organizationId,
        error: (result.error as AppError).message,
      });
      return result;
    }

    return ok({ payments: result.value });
  }

  async getById(paymentId: string): Promise<Result<Payment>> {
    return this.deps.paymentStore.findPaymentById(paymentId as Id<string>);
  }
}
