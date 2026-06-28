// Maps Invoice domain objects to HTTP response shapes, including tax enrichment.

import type { Invoice } from "@veritas/billing";
import type { TaxResult } from "@veritas/tax";

export interface InvoiceLineItemResponse {
  readonly description: string;
  readonly quantity: number;
  readonly unitPrice: { currency: string; amount: string };
  readonly amount: { currency: string; amount: string };
}

export interface InvoiceResponse {
  readonly id: string;
  readonly organizationId: string;
  readonly subscriptionId: string | null;
  readonly number: string;
  readonly status: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly lineItems: readonly InvoiceLineItemResponse[];
  readonly subtotal: { currency: string; amount: string };
  readonly total: { currency: string; amount: string };
  readonly dueAt: string | null;
  readonly paidAt: string | null;
  readonly tax?: TaxSummaryResponse;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface TaxSummaryResponse {
  readonly totalTaxBaseUnits: string;
  readonly totalWithTaxBaseUnits: string;
  readonly effectiveRate: number;
  readonly isExempt: boolean;
  readonly exemptionCode?: string;
  readonly lines: ReadonlyArray<{
    readonly taxType: string;
    readonly jurisdiction: string;
    readonly rate: number;
    readonly taxAmountBaseUnits: string;
  }>;
}

export function toInvoiceResponse(
  invoice: Invoice,
  tax?: TaxResult,
): InvoiceResponse {
  return {
    id: invoice.id,
    organizationId: invoice.organizationId,
    subscriptionId: invoice.subscriptionId,
    number: invoice.number,
    status: invoice.status,
    periodStart: invoice.periodStart,
    periodEnd: invoice.periodEnd,
    lineItems: invoice.lineItems.map((li) => ({
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      amount: li.amount,
    })),
    subtotal: invoice.subtotal,
    total: invoice.total,
    dueAt: invoice.dueAt,
    paidAt: invoice.paidAt,
    ...(tax !== undefined && { tax: toTaxSummaryResponse(tax) }),
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
  };
}

function toTaxSummaryResponse(tax: TaxResult): TaxSummaryResponse {
  return {
    totalTaxBaseUnits: tax.totalTaxBaseUnits.toString(),
    totalWithTaxBaseUnits: tax.totalWithTaxBaseUnits.toString(),
    effectiveRate: tax.effectiveRate,
    isExempt: tax.isExempt,
    exemptionCode: tax.exemptionCode,
    lines: tax.lines.map((l) => ({
      taxType: l.taxType,
      jurisdiction: l.jurisdiction,
      rate: l.rate,
      taxAmountBaseUnits: l.taxAmountBaseUnits.toString(),
    })),
  };
}
