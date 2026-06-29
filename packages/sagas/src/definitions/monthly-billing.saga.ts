// MonthlyBilling saga: snapshot usage, generate invoice, charge wallet, and record settlement.
import { ok, err, type Result } from "@veritas/core";
import type { SagaContext } from "../context.js";
import type { SagaStep } from "../step.js";
import type { Saga } from "../saga.js";

export interface MonthlyBillingInput {
  readonly organizationId: string;
  readonly subscriptionId: string;
  readonly billingPeriodStart: string;
  readonly billingPeriodEnd: string;
}

export interface MonthlyBillingOutput {
  readonly invoiceId: string;
  readonly amountChargedUsdc: bigint;
  readonly settlementId: string;
}

export interface UsageSnapshotPort {
  snapshot(organizationId: string, periodStart: string, periodEnd: string, ctx: SagaContext): Promise<{ usageId: string; totalUnits: number }>;
  rollbackSnapshot(usageId: string, ctx: SagaContext): Promise<void>;
}

export interface InvoicePort {
  create(organizationId: string, subscriptionId: string, usageId: string, periodStart: string, periodEnd: string, ctx: SagaContext): Promise<{ invoiceId: string; amountUsdc: bigint }>;
  void(invoiceId: string, ctx: SagaContext): Promise<void>;
}

export interface WalletChargePort {
  charge(organizationId: string, invoiceId: string, amountUsdc: bigint, ctx: SagaContext): Promise<{ chargeId: string }>;
  refund(chargeId: string, ctx: SagaContext): Promise<void>;
}

export interface BillingSettlementPort {
  record(invoiceId: string, chargeId: string, ctx: SagaContext): Promise<{ settlementId: string }>;
}

export interface MonthlyBillingPorts {
  readonly usage: UsageSnapshotPort;
  readonly invoice: InvoicePort;
  readonly charge: WalletChargePort;
  readonly settlement: BillingSettlementPort;
}

function snapshotUsageStep(ports: MonthlyBillingPorts): SagaStep<MonthlyBillingInput, { usageId: string; totalUnits: number }> {
  return {
    name: "snapshotUsage",
    async execute(input, ctx) {
      const result = await ports.usage.snapshot(
        input.organizationId,
        input.billingPeriodStart,
        input.billingPeriodEnd,
        ctx,
      );
      return ok(result);
    },
    async compensate(input, ctx) {
      const usageId = ctx.data["usageId"] as string | undefined;
      if (usageId) {
        await ports.usage.rollbackSnapshot(usageId, ctx);
      }
    },
  };
}

function createInvoiceStep(ports: MonthlyBillingPorts): SagaStep<MonthlyBillingInput, { invoiceId: string; amountUsdc: bigint }> {
  return {
    name: "createInvoice",
    async execute(input, ctx) {
      const usageId = ctx.data["usageId"] as string | undefined;
      if (!usageId) return err(new Error("usageId missing from context"));
      const result = await ports.invoice.create(
        input.organizationId,
        input.subscriptionId,
        usageId,
        input.billingPeriodStart,
        input.billingPeriodEnd,
        ctx,
      );
      return ok(result);
    },
    async compensate(input, ctx) {
      const invoiceId = ctx.data["invoiceId"] as string | undefined;
      if (invoiceId) {
        await ports.invoice.void(invoiceId, ctx);
      }
    },
  };
}

function chargeWalletStep(ports: MonthlyBillingPorts): SagaStep<MonthlyBillingInput, { chargeId: string }> {
  return {
    name: "chargeWallet",
    async execute(input, ctx) {
      const invoiceId = ctx.data["invoiceId"] as string | undefined;
      const amountUsdc = ctx.data["amountUsdc"] as bigint | undefined;
      if (!invoiceId || amountUsdc === undefined) {
        return err(new Error("invoiceId or amountUsdc missing from context"));
      }
      const result = await ports.charge.charge(input.organizationId, invoiceId, amountUsdc, ctx);
      return ok(result);
    },
    async compensate(input, ctx) {
      const chargeId = ctx.data["chargeId"] as string | undefined;
      if (chargeId) {
        await ports.charge.refund(chargeId, ctx);
      }
    },
  };
}

function recordSettlementStep(ports: MonthlyBillingPorts): SagaStep<MonthlyBillingInput, { settlementId: string }> {
  return {
    name: "recordSettlement",
    async execute(input, ctx) {
      const invoiceId = ctx.data["invoiceId"] as string | undefined;
      const chargeId = ctx.data["chargeId"] as string | undefined;
      if (!invoiceId || !chargeId) {
        return err(new Error("invoiceId or chargeId missing from context"));
      }
      const result = await ports.settlement.record(invoiceId, chargeId, ctx);
      return ok(result);
    },
    async compensate(_input, _ctx) {
      // Settlement records are append-only; no rollback needed.
    },
  };
}

export function monthlyBillingSaga(ports: MonthlyBillingPorts): Saga<MonthlyBillingInput, MonthlyBillingOutput> {
  return {
    name: "MonthlyBilling",
    steps: [
      snapshotUsageStep(ports),
      createInvoiceStep(ports),
      chargeWalletStep(ports),
      recordSettlementStep(ports),
    ],
    buildOutput(_input, data): Result<MonthlyBillingOutput> {
      const invoiceId = data["invoiceId"] as string | undefined;
      const amountUsdc = data["amountUsdc"] as bigint | undefined;
      const settlementId = data["settlementId"] as string | undefined;
      if (!invoiceId || amountUsdc === undefined || !settlementId) {
        return err(new Error("Incomplete output data for MonthlyBilling saga"));
      }
      return ok({ invoiceId, amountChargedUsdc: amountUsdc, settlementId });
    },
  };
}
