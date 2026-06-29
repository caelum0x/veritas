// Payment repository port + in-memory implementation for storing payments, refunds, and payouts.

import {
  type Result,
  ok,
  err,
  type Id,
  newId,
  systemClock,
  epochToIso,
} from "@veritas/core";
import {
  type Payment,
  type CreatePaymentInput,
  type UpdatePaymentInput,
  type Refund,
  type CreateRefundInput,
  type Payout,
  type CreatePayoutInput,
} from "./types.js";
import { PaymentNotFoundError } from "./errors.js";

export interface PaymentStore {
  createPayment(input: CreatePaymentInput): Promise<Result<Payment>>;
  findPaymentById(id: Id<string>): Promise<Result<Payment>>;
  findPaymentByOrderId(orderId: Id<string>): Promise<Result<Payment | null>>;
  updatePayment(id: Id<string>, input: UpdatePaymentInput): Promise<Result<Payment>>;
  listPaymentsByOrg(organizationId: Id<string>): Promise<Result<Payment[]>>;

  createRefund(input: CreateRefundInput): Promise<Result<Refund>>;
  findRefundById(id: Id<string>): Promise<Result<Refund>>;
  listRefundsByPayment(paymentId: Id<string>): Promise<Result<Refund[]>>;

  createPayout(input: CreatePayoutInput): Promise<Result<Payout>>;
  findPayoutById(id: Id<string>): Promise<Result<Payout>>;
  updatePayout(
    id: Id<string>,
    patch: Partial<Pick<Payout, "status" | "processorRef" | "failureReason">>,
  ): Promise<Result<Payout>>;
}

export class InMemoryPaymentStore implements PaymentStore {
  private readonly payments = new Map<string, Payment>();
  private readonly refunds = new Map<string, Refund>();
  private readonly payouts = new Map<string, Payout>();
  private readonly clock = systemClock;

  async createPayment(input: CreatePaymentInput): Promise<Result<Payment>> {
    const now = epochToIso(this.clock.now());
    const payment: Payment = {
      id: newId("pay") as Id<string>,
      orderId: input.orderId,
      organizationId: input.organizationId,
      processorId: input.processorId,
      processorRef: null,
      status: "PENDING",
      amount: input.amount,
      fee: input.fee,
      net: input.net,
      idempotencyKey: input.idempotencyKey ?? null,
      failureReason: null,
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };
    this.payments.set(payment.id as string, payment);
    return ok(payment);
  }

  async findPaymentById(id: Id<string>): Promise<Result<Payment>> {
    const payment = this.payments.get(id as string);
    if (!payment) return err(new PaymentNotFoundError(id as string));
    return ok(payment);
  }

  async findPaymentByOrderId(orderId: Id<string>): Promise<Result<Payment | null>> {
    const found = [...this.payments.values()].find((p) => p.orderId === orderId) ?? null;
    return ok(found);
  }

  async updatePayment(id: Id<string>, input: UpdatePaymentInput): Promise<Result<Payment>> {
    const existing = this.payments.get(id as string);
    if (!existing) return err(new PaymentNotFoundError(id as string));
    const updated: Payment = {
      ...existing,
      ...(input.status !== undefined && { status: input.status }),
      ...(input.processorRef !== undefined && { processorRef: input.processorRef }),
      ...(input.failureReason !== undefined && { failureReason: input.failureReason }),
      updatedAt: epochToIso(this.clock.now()),
    };
    this.payments.set(id as string, updated);
    return ok(updated);
  }

  async listPaymentsByOrg(organizationId: Id<string>): Promise<Result<Payment[]>> {
    const list = [...this.payments.values()].filter(
      (p) => p.organizationId === organizationId,
    );
    return ok(list);
  }

  async createRefund(input: CreateRefundInput): Promise<Result<Refund>> {
    const now = epochToIso(this.clock.now());
    const refund: Refund = {
      id: newId("ref") as Id<string>,
      paymentId: input.paymentId,
      processorRef: null,
      amount: input.amount,
      reason: input.reason,
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    };
    this.refunds.set(refund.id as string, refund);
    return ok(refund);
  }

  async findRefundById(id: Id<string>): Promise<Result<Refund>> {
    const refund = this.refunds.get(id as string);
    if (!refund) return err(new PaymentNotFoundError(id as string));
    return ok(refund);
  }

  async listRefundsByPayment(paymentId: Id<string>): Promise<Result<Refund[]>> {
    const list = [...this.refunds.values()].filter((r) => r.paymentId === paymentId);
    return ok(list);
  }

  async createPayout(input: CreatePayoutInput): Promise<Result<Payout>> {
    const now = epochToIso(this.clock.now());
    const payout: Payout = {
      id: newId("pout") as Id<string>,
      walletId: input.walletId,
      processorId: input.processorId,
      processorRef: null,
      amount: input.amount,
      status: "PENDING",
      failureReason: null,
      createdAt: now,
      updatedAt: now,
    };
    this.payouts.set(payout.id as string, payout);
    return ok(payout);
  }

  async findPayoutById(id: Id<string>): Promise<Result<Payout>> {
    const payout = this.payouts.get(id as string);
    if (!payout) return err(new PaymentNotFoundError(id as string));
    return ok(payout);
  }

  async updatePayout(
    id: Id<string>,
    patch: Partial<Pick<Payout, "status" | "processorRef" | "failureReason">>,
  ): Promise<Result<Payout>> {
    const existing = this.payouts.get(id as string);
    if (!existing) return err(new PaymentNotFoundError(id as string));
    const updated: Payout = {
      ...existing,
      ...patch,
      updatedAt: epochToIso(this.clock.now()),
    };
    this.payouts.set(id as string, updated);
    return ok(updated);
  }
}
