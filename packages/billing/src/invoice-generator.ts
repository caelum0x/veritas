// InvoiceGenerator: produce invoice records from plan charges and usage data.

import { newId, Id, IsoTimestamp, epochToIso, Logger, noopLogger, Result, ok, err } from "@veritas/core";
import { type Money } from "@veritas/contracts";
import { z } from "zod";
import { InvoiceSchema, InvoiceLineItemSchema, InvoiceStatusSchema } from "@veritas/contracts";
import { type Plan } from "./plans.js";
import { type PeriodUsage } from "./usage-aggregator.js";
import { computeCharges, type ChargeResult, type LineItem } from "./pricing.js";

export type Invoice = z.infer<typeof InvoiceSchema>;
export type InvoiceLineItem = z.infer<typeof InvoiceLineItemSchema>;
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

export interface InvoiceGeneratorOptions {
  readonly logger?: Logger;
}

export interface GenerateInvoiceInput {
  readonly organizationId: Id<"org">;
  readonly plan: Plan;
  readonly periodStart: IsoTimestamp;
  readonly periodEnd: IsoTimestamp;
  readonly usages: readonly PeriodUsage[];
  readonly subscriptionId: Id<"sub">;
}

function bigintToMoney(units: bigint): Money {
  return { currency: "USDC", amount: units.toString() };
}

function addMoney(a: Money, b: Money): Money {
  return bigintToMoney(BigInt(a.amount) + BigInt(b.amount));
}

function zeroMoney(): Money {
  return { currency: "USDC", amount: "0" };
}

function lineItemFromCharge(item: LineItem): InvoiceLineItem {
  return {
    description: `${item.metric} — ${item.overageQuantity} units over ${item.includedQuantity} included`,
    quantity: item.overageQuantity,
    unitPrice: bigintToMoney(item.pricePerUnit),
    amount: bigintToMoney(item.overageCharge),
  };
}

function basePlanLineItem(plan: Plan, periodStart: IsoTimestamp, periodEnd: IsoTimestamp): InvoiceLineItem {
  return {
    description: `${plan.name} plan — ${periodStart} to ${periodEnd}`,
    quantity: 1,
    unitPrice: bigintToMoney(plan.basePrice),
    amount: bigintToMoney(plan.basePrice),
  };
}

export class InvoiceGenerator {
  private readonly logger: Logger;

  constructor(opts: InvoiceGeneratorOptions = {}) {
    this.logger = opts.logger ?? noopLogger;
  }

  generate(input: GenerateInvoiceInput): Result<Invoice, Error> {
    const { organizationId, plan, periodStart, periodEnd, usages, subscriptionId } = input;

    if (!plan.isActive) {
      return err(new Error(`Plan ${plan.id} is not active`));
    }

    const charges: ChargeResult = computeCharges(plan, usages);

    const lineItems: InvoiceLineItem[] = [
      basePlanLineItem(plan, periodStart, periodEnd),
      ...charges.lineItems
        .filter((li) => li.overageQuantity > 0)
        .map(lineItemFromCharge),
    ];

    const subtotal = lineItems.reduce((sum, li) => addMoney(sum, li.amount), zeroMoney());
    const now = epochToIso(Date.now());

    const invoice: Invoice = {
      id: newId("inv"),
      organizationId,
      subscriptionId,
      number: `INV-${Date.now()}`,
      status: "DRAFT",
      periodStart,
      periodEnd,
      lineItems,
      subtotal,
      total: subtotal,
      dueAt: periodEnd,
      paidAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.logger.info("invoice.generated", {
      invoiceId: invoice.id,
      organizationId,
      total: subtotal.amount,
      lineItemCount: lineItems.length,
    });

    return ok(invoice);
  }

  finalize(invoice: Invoice): Invoice {
    return {
      ...invoice,
      status: "OPEN",
      updatedAt: epochToIso(Date.now()),
    };
  }

  markPaid(invoice: Invoice, paidAt?: IsoTimestamp): Invoice {
    return {
      ...invoice,
      status: "PAID",
      paidAt: paidAt ?? epochToIso(Date.now()),
      updatedAt: epochToIso(Date.now()),
    };
  }

  void_(invoice: Invoice): Invoice {
    return {
      ...invoice,
      status: "VOID",
      updatedAt: epochToIso(Date.now()),
    };
  }
}
