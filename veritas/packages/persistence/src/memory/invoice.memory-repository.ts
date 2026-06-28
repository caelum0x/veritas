// In-memory implementation of InvoiceRepository backed by MemoryStore.
import { ok, err, epochToIso, newId } from "@veritas/core";
import type { Result, Page } from "@veritas/core";
import type { Invoice, CreateInvoice, InvoiceStatus, InvoiceLineItem } from "@veritas/contracts";
import { MemoryStore } from "./memory-store.js";
import { RepositoryNotFoundError, RepositoryConflictError } from "../errors.js";
import type { InvoiceRepository } from "../repositories/invoice.repository.js";
import type { QueryOptions } from "../query.js";
import { evalFilter, applySort } from "../query.js";
import { paginateArray } from "../pagination.js";

/** Persistence row shape for an Invoice. */
interface InvoiceRow {
  readonly id: string;
  readonly organizationId: string;
  readonly subscriptionId: string | null;
  readonly number: string;
  readonly status: string;
  readonly lineItems: ReadonlyArray<InvoiceLineItem>;
  readonly subtotal: string;
  readonly total: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly dueAt: string | null;
  readonly paidAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Compute subtotal and total from line items (sum of amounts). */
function computeTotals(lineItems: ReadonlyArray<InvoiceLineItem>): { subtotal: string; total: string } {
  const cents = lineItems.reduce((acc, item) => acc + Number(item.amount.amount), 0);
  const formatted = String(cents);
  return { subtotal: formatted, total: formatted };
}

/** Generate a sequential invoice number in format INV-YYYYMM-NNNN. */
function generateNumber(now: string, sequence: number): string {
  const d = new Date(now);
  const ym = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return `INV-${ym}-${String(sequence).padStart(4, "0")}`;
}

function rowToInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id as Invoice["id"],
    organizationId: row.organizationId as Invoice["organizationId"],
    subscriptionId: row.subscriptionId as Invoice["subscriptionId"],
    number: row.number,
    status: row.status as InvoiceStatus,
    lineItems: row.lineItems.map((li) => ({ ...li })),
    subtotal: { amount: row.subtotal, currency: "USDC" },
    total: { amount: row.total, currency: "USDC" },
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    dueAt: row.dueAt,
    paidAt: row.paidAt,
    createdAt: row.createdAt as Invoice["createdAt"],
    updatedAt: row.updatedAt as Invoice["updatedAt"],
  } as Invoice;
}

/** In-memory InvoiceRepository implementation for development and testing. */
export class InvoiceMemoryRepository implements InvoiceRepository {
  private readonly store = new MemoryStore<InvoiceRow & { readonly id: string }>();
  private sequence = 0;

  async findById(id: string): Promise<Result<Invoice>> {
    const row = this.store.get(id);
    if (row === undefined) {
      return err(new RepositoryNotFoundError("Invoice", id));
    }
    return ok(rowToInvoice(row));
  }

  async list(options?: QueryOptions<Invoice>): Promise<Result<Page<Invoice>>> {
    let rows = this.store.all().map(rowToInvoice);
    if (options?.filter !== undefined) {
      rows = rows.filter((r) => evalFilter(r, options.filter!));
    }
    if (options?.sort !== undefined && options.sort.length > 0) {
      rows = applySort(rows, options.sort);
    } else {
      rows = [...rows].sort((a, b) => b.periodStart.localeCompare(a.periodStart));
    }
    return ok(paginateArray(rows, options?.page));
  }

  async create(dto: CreateInvoice): Promise<Result<Invoice>> {
    const now = epochToIso(Date.now());
    this.sequence += 1;
    const number = generateNumber(now, this.sequence);
    const { subtotal, total } = computeTotals(dto.lineItems);
    const row: InvoiceRow = {
      id: newId("inv"),
      organizationId: dto.organizationId,
      subscriptionId: dto.subscriptionId ?? null,
      number,
      status: "DRAFT",
      lineItems: dto.lineItems.map((li) => ({ ...li })),
      subtotal,
      total,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      dueAt: dto.dueAt ?? null,
      paidAt: null,
      createdAt: now,
      updatedAt: now,
    };
    const stored = this.store.set(row);
    return ok(rowToInvoice(stored));
  }

  async update(
    id: string,
    dto: Partial<CreateInvoice> & { status?: InvoiceStatus; paidAt?: string | null },
  ): Promise<Result<Invoice>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Invoice", id));
    }
    const now = epochToIso(Date.now());
    const lineItems = dto.lineItems ?? existing.lineItems;
    const { subtotal, total } = computeTotals(lineItems);
    const updated: InvoiceRow = {
      ...existing,
      ...(dto.subscriptionId !== undefined ? { subscriptionId: dto.subscriptionId ?? null } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      lineItems: lineItems.map((li) => ({ ...li })),
      subtotal,
      total,
      ...(dto.periodStart !== undefined ? { periodStart: dto.periodStart } : {}),
      ...(dto.periodEnd !== undefined ? { periodEnd: dto.periodEnd } : {}),
      ...(dto.dueAt !== undefined ? { dueAt: dto.dueAt ?? null } : {}),
      ...(dto.paidAt !== undefined ? { paidAt: dto.paidAt ?? null } : {}),
      updatedAt: now,
    };
    const stored = this.store.set(updated);
    return ok(rowToInvoice(stored));
  }

  async delete(id: string): Promise<Result<Invoice>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Invoice", id));
    }
    this.store.delete(id);
    return ok(rowToInvoice(existing));
  }

  async findByOrganizationId(
    organizationId: string,
    options?: QueryOptions<Invoice>,
  ): Promise<Result<Page<Invoice>>> {
    let rows = this.store.all().map(rowToInvoice).filter((r) => r.organizationId === organizationId);
    if (options?.filter !== undefined) {
      rows = rows.filter((r) => evalFilter(r, options.filter!));
    }
    if (options?.sort !== undefined && options.sort.length > 0) {
      rows = applySort(rows, options.sort);
    } else {
      rows = [...rows].sort((a, b) => b.periodStart.localeCompare(a.periodStart));
    }
    return ok(paginateArray(rows, options?.page));
  }

  async findBySubscriptionId(
    subscriptionId: string,
    options?: QueryOptions<Invoice>,
  ): Promise<Result<Page<Invoice>>> {
    let rows = this.store.all().map(rowToInvoice).filter((r) => r.subscriptionId === subscriptionId);
    if (options?.filter !== undefined) {
      rows = rows.filter((r) => evalFilter(r, options.filter!));
    }
    if (options?.sort !== undefined && options.sort.length > 0) {
      rows = applySort(rows, options.sort);
    } else {
      rows = [...rows].sort((a, b) => b.periodStart.localeCompare(a.periodStart));
    }
    return ok(paginateArray(rows, options?.page));
  }

  async findByStatus(
    status: InvoiceStatus,
    options?: QueryOptions<Invoice>,
  ): Promise<Result<Page<Invoice>>> {
    let rows = this.store.all().map(rowToInvoice).filter((r) => r.status === status);
    if (options?.filter !== undefined) {
      rows = rows.filter((r) => evalFilter(r, options.filter!));
    }
    if (options?.sort !== undefined && options.sort.length > 0) {
      rows = applySort(rows, options.sort);
    } else {
      rows = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return ok(paginateArray(rows, options?.page));
  }

  async findByNumber(number: string): Promise<Result<Invoice>> {
    const match = this.store.all().map(rowToInvoice).find((r) => r.number === number);
    if (match === undefined) {
      return err(new RepositoryNotFoundError("Invoice", number));
    }
    return ok(match);
  }
}
