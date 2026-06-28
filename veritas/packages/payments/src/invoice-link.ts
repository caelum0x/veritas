// Links payments to invoices: mark invoices paid and track which payment settled them.

import { type Result, ok, err, NotFoundError, ConflictError, InternalError } from "@veritas/core";
import type { Invoice, InvoiceStatus } from "@veritas/contracts";

/** Minimal read/write surface for invoice persistence needed by this module. */
export interface InvoiceRepository {
  findById(id: string): Promise<Invoice | undefined>;
  updateStatus(id: string, status: InvoiceStatus, paidAt: string | null): Promise<Invoice>;
}

/** Mapping record linking a payment to an invoice. */
export interface PaymentInvoiceLink {
  readonly paymentId: string;
  readonly invoiceId: string;
  readonly linkedAt: string;
}

/** In-memory store for payment→invoice links. */
export class PaymentInvoiceLinkStore {
  private readonly links: Map<string, PaymentInvoiceLink> = new Map();

  /** Record that a payment has been linked to an invoice (keyed by paymentId). */
  add(link: PaymentInvoiceLink): void {
    this.links.set(link.paymentId, { ...link });
  }

  /** Look up the invoice ID linked to a payment, if any. */
  findByPaymentId(paymentId: string): PaymentInvoiceLink | undefined {
    return this.links.get(paymentId);
  }

  /** Return all links for a given invoice ID. */
  findByInvoiceId(invoiceId: string): ReadonlyArray<PaymentInvoiceLink> {
    return Array.from(this.links.values()).filter((l) => l.invoiceId === invoiceId);
  }

  /** Remove a link by paymentId; returns true if it existed. */
  remove(paymentId: string): boolean {
    return this.links.delete(paymentId);
  }
}

/** Service that coordinates linking payments to invoices and marking them paid. */
export class InvoiceLinkService {
  constructor(
    private readonly invoiceRepo: InvoiceRepository,
    private readonly linkStore: PaymentInvoiceLinkStore,
  ) {}

  /**
   * Link a payment to an invoice and mark the invoice as PAID.
   * Idempotent: if the link already exists the invoice is left unchanged and
   * an ok result is returned.
   */
  async linkAndMarkPaid(paymentId: string, invoiceId: string): Promise<Result<Invoice>> {
    try {
      const existing = this.linkStore.findByPaymentId(paymentId);
      if (existing !== undefined) {
        const invoice = await this.invoiceRepo.findById(invoiceId);
        if (invoice === undefined) {
          return err(new NotFoundError({ message: `Invoice not found: ${invoiceId}` }));
        }
        return ok(invoice);
      }

      const invoice = await this.invoiceRepo.findById(invoiceId);
      if (invoice === undefined) {
        return err(new NotFoundError({ message: `Invoice not found: ${invoiceId}` }));
      }

      if (invoice.status === "VOID" || invoice.status === "UNCOLLECTIBLE") {
        return err(
          new ConflictError({
            message: `Cannot pay invoice with status ${invoice.status}`,
          }),
        );
      }

      const now = new Date().toISOString();
      const updated = await this.invoiceRepo.updateStatus(invoiceId, "PAID", now);
      this.linkStore.add({ paymentId, invoiceId, linkedAt: now });
      return ok(updated);
    } catch (e) {
      return err(new InternalError({ message: "Failed to link payment to invoice", cause: e }));
    }
  }

  /**
   * Unlink a payment from its invoice (e.g. after a refund) and revert the
   * invoice to OPEN if no other payments remain linked to it.
   */
  async unlinkAndRevert(paymentId: string): Promise<Result<void>> {
    try {
      const link = this.linkStore.findByPaymentId(paymentId);
      if (link === undefined) return ok(undefined);

      this.linkStore.remove(paymentId);

      const remaining = this.linkStore.findByInvoiceId(link.invoiceId);
      if (remaining.length === 0) {
        const invoice = await this.invoiceRepo.findById(link.invoiceId);
        if (invoice !== undefined && invoice.status === "PAID") {
          await this.invoiceRepo.updateStatus(link.invoiceId, "OPEN", null);
        }
      }
      return ok(undefined);
    } catch (e) {
      return err(new InternalError({ message: "Failed to unlink payment from invoice", cause: e }));
    }
  }

  /** Return the link record for a payment, if any. */
  getLink(paymentId: string): PaymentInvoiceLink | undefined {
    return this.linkStore.findByPaymentId(paymentId);
  }
}
