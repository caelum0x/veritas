// Invoice service: generates, finalizes, and manages invoices via @veritas/billing and @veritas/tax.

import {
  ok,
  err,
  isErr,
  asIsoTimestamp,
  type Result,
  type Id,
  NotFoundError,
  ValidationError,
} from "@veritas/core";
import {
  InvoiceGenerator,
  getPlanById,
  Ledger,
  type Invoice,
} from "@veritas/billing";
import type { TaxCalculator } from "@veritas/tax";
import type { TaxContext, TaxResult } from "@veritas/tax";
import type { Logger } from "@veritas/observability";
import type { GenerateInvoiceBody, ListInvoicesQuery, ApplyTaxBody } from "./invoices.schema.js";

/** In-process invoice store (replaced by DB adapter in production). */
const invoices = new Map<string, Invoice>();
const invoiceTaxResults = new Map<string, TaxResult>();

export interface InvoiceServiceDeps {
  readonly logger: Logger;
  readonly invoiceGenerator: InvoiceGenerator;
  readonly ledger: Ledger;
  readonly taxCalculator: TaxCalculator;
}

export class InvoiceService {
  private readonly logger: Logger;
  private readonly invoiceGenerator: InvoiceGenerator;
  private readonly ledger: Ledger;
  private readonly taxCalculator: TaxCalculator;

  constructor(deps: InvoiceServiceDeps) {
    this.logger = deps.logger;
    this.invoiceGenerator = deps.invoiceGenerator;
    this.ledger = deps.ledger;
    this.taxCalculator = deps.taxCalculator;
  }

  generateInvoice(
    body: GenerateInvoiceBody,
  ): Result<Invoice, NotFoundError | ValidationError> {
    const plan = getPlanById(body.planId);
    if (plan === undefined) {
      return err(new NotFoundError({ message: `Plan '${body.planId}' not found` }));
    }

    const periodStart = asIsoTimestamp(body.periodStart);
    const periodEnd = asIsoTimestamp(body.periodEnd);

    const result = this.invoiceGenerator.generate({
      organizationId: body.organizationId as Id<"org">,
      plan,
      subscriptionId: body.subscriptionId as Id<"sub">,
      periodStart,
      periodEnd,
      usages: body.usages.map((u) => ({
        metric: u.metric,
        totalQuantity: u.quantity,
        organizationId: (u.organizationId ?? body.organizationId) as Id<string>,
        periodStart,
        periodEnd,
        eventCount: 1,
      })),
    });

    if (isErr(result)) {
      return err(new ValidationError({ message: result.error.message }));
    }

    const invoice = result.value;
    invoices.set(invoice.id, invoice);

    // Append invoice charge to the ledger (Ledger uses MoneyValue with bigint amount).
    this.ledger.append(
      body.organizationId as Id<"org">,
      "charge",
      { amount: BigInt(invoice.total.amount), currency: "USDC" as const },
      `Invoice ${invoice.number} generated`,
      { referenceId: invoice.id as unknown as Id<string> },
    );

    this.logger.info("invoice.generated", {
      invoiceId: invoice.id,
      organizationId: body.organizationId,
      total: invoice.total.amount,
    });

    return ok(invoice);
  }

  getInvoice(invoiceId: string): Result<Invoice, NotFoundError> {
    const inv = invoices.get(invoiceId);
    if (inv === undefined) {
      return err(new NotFoundError({ message: `Invoice '${invoiceId}' not found` }));
    }
    return ok(inv);
  }

  listInvoices(query: ListInvoicesQuery): readonly Invoice[] {
    let result = [...invoices.values()];

    if (query.organizationId !== undefined) {
      result = result.filter((i) => i.organizationId === query.organizationId);
    }
    if (query.status !== undefined) {
      result = result.filter((i) => i.status === query.status);
    }
    if (query.cursor !== undefined) {
      const idx = result.findIndex((i) => i.id === query.cursor);
      if (idx !== -1) result = result.slice(idx + 1);
    }

    return result.slice(0, query.limit);
  }

  finalizeInvoice(invoiceId: string): Result<Invoice, NotFoundError | ValidationError> {
    const inv = invoices.get(invoiceId);
    if (inv === undefined) {
      return err(new NotFoundError({ message: `Invoice '${invoiceId}' not found` }));
    }
    if (inv.status !== "DRAFT") {
      return err(new ValidationError({ message: `Invoice ${invoiceId} is not in DRAFT status` }));
    }

    const finalized = this.invoiceGenerator.finalize(inv);
    invoices.set(invoiceId, finalized);

    this.logger.info("invoice.finalized", { invoiceId });

    return ok(finalized);
  }

  markPaid(invoiceId: string): Result<Invoice, NotFoundError | ValidationError> {
    const inv = invoices.get(invoiceId);
    if (inv === undefined) {
      return err(new NotFoundError({ message: `Invoice '${invoiceId}' not found` }));
    }
    if (inv.status === "PAID") {
      return err(new ValidationError({ message: `Invoice ${invoiceId} is already PAID` }));
    }
    if (inv.status === "VOID") {
      return err(new ValidationError({ message: `Invoice ${invoiceId} is VOID and cannot be paid` }));
    }

    const paid = this.invoiceGenerator.markPaid(inv);
    invoices.set(invoiceId, paid);

    // Record settlement in the ledger.
    this.ledger.append(
      inv.organizationId as Id<"org">,
      "settlement",
      { amount: BigInt(inv.total.amount), currency: "USDC" as const },
      `Invoice ${inv.number} paid`,
      { referenceId: invoiceId as unknown as Id<string> },
    );

    this.logger.info("invoice.paid", { invoiceId, total: inv.total.amount });

    return ok(paid);
  }

  voidInvoice(invoiceId: string): Result<Invoice, NotFoundError | ValidationError> {
    const inv = invoices.get(invoiceId);
    if (inv === undefined) {
      return err(new NotFoundError({ message: `Invoice '${invoiceId}' not found` }));
    }
    if (inv.status === "PAID") {
      return err(new ValidationError({ message: `Cannot void a PAID invoice` }));
    }
    if (inv.status === "VOID") {
      return err(new ValidationError({ message: `Invoice ${invoiceId} is already VOID` }));
    }

    const voided = this.invoiceGenerator.void_(inv);
    invoices.set(invoiceId, voided);

    this.logger.info("invoice.voided", { invoiceId });

    return ok(voided);
  }

  async applyTax(body: ApplyTaxBody): Promise<Result<TaxResult, NotFoundError | ValidationError>> {
    const inv = invoices.get(body.invoiceId);
    if (inv === undefined) {
      return err(new NotFoundError({ message: `Invoice '${body.invoiceId}' not found` }));
    }

    const ctx: TaxContext = {
      buyerCountry: body.buyerCountry,
      sellerCountry: body.sellerCountry,
      category: body.category,
      isB2B: body.isB2B,
      buyerVatNumber: body.buyerVatNumber,
    };

    const amountBaseUnits = BigInt(inv.subtotal.amount);
    const taxResult = await this.taxCalculator.calculate(amountBaseUnits, ctx);

    if (isErr(taxResult)) {
      return err(new ValidationError({ message: String(taxResult.error) }));
    }

    invoiceTaxResults.set(body.invoiceId, taxResult.value);

    this.logger.info("invoice.tax_applied", {
      invoiceId: body.invoiceId,
      totalTaxBaseUnits: taxResult.value.totalTaxBaseUnits.toString(),
      effectiveRate: taxResult.value.effectiveRate,
    });

    return ok(taxResult.value);
  }

  getTaxResult(invoiceId: string): TaxResult | undefined {
    return invoiceTaxResults.get(invoiceId);
  }
}
