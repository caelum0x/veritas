// InvoiceRepository interface defining persistence operations for billing invoices.
import type { Result, Page } from "@veritas/core";
import type { Invoice, CreateInvoice, InvoiceStatus } from "@veritas/contracts";
import type { BaseRepository } from "../base-repository.js";
import type { QueryOptions } from "../query.js";

/** Extended repository interface for Invoice entities. */
export interface InvoiceRepository extends BaseRepository<Invoice, CreateInvoice, Partial<CreateInvoice>> {
  /** Find a single invoice by its opaque ID. */
  findById(id: string): Promise<Result<Invoice>>;

  /** List invoices with optional filtering, sorting, and cursor pagination. */
  list(options?: QueryOptions<Invoice>): Promise<Result<Page<Invoice>>>;

  /** Create a new invoice from a CreateInvoice DTO. */
  create(dto: CreateInvoice): Promise<Result<Invoice>>;

  /** Apply a partial update to an existing invoice. */
  update(id: string, dto: Partial<CreateInvoice> & { status?: InvoiceStatus; paidAt?: string | null }): Promise<Result<Invoice>>;

  /** Delete an invoice by ID, returning the deleted entity. */
  delete(id: string): Promise<Result<Invoice>>;

  /** Find all invoices for a given organization, ordered by period start descending. */
  findByOrganizationId(organizationId: string, options?: QueryOptions<Invoice>): Promise<Result<Page<Invoice>>>;

  /** Find all invoices for a given subscription. */
  findBySubscriptionId(subscriptionId: string, options?: QueryOptions<Invoice>): Promise<Result<Page<Invoice>>>;

  /** Find invoices matching a specific status. */
  findByStatus(status: InvoiceStatus, options?: QueryOptions<Invoice>): Promise<Result<Page<Invoice>>>;

  /** Find an invoice by its unique human-readable invoice number. */
  findByNumber(number: string): Promise<Result<Invoice>>;
}
