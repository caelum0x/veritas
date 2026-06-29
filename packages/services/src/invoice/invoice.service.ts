// Invoice application service: use-cases for invoice lifecycle management.
import { ok, err, isOk } from "@veritas/core";
import type { Result, AppError, Page, PageRequest } from "@veritas/core";
import type { Invoice, InvoiceStatus } from "@veritas/contracts";
import type { InvoiceRepository } from "@veritas/persistence";
import { BaseService, type BaseServiceDeps } from "../base-service.js";
import type { ServiceContext } from "../service-context.js";
import { ResourceNotFoundError, PreconditionFailedError, InsufficientPermissionsError } from "../errors.js";
import { serviceCall } from "../result.js";
import type {
  CreateInvoiceInput,
  UpdateInvoiceStatusInput,
  GetInvoiceInput,
  GetInvoiceByNumberInput,
  ListInvoicesInput,
  InvoiceOutput,
} from "./invoice.dto.js";

/** Dependencies required by InvoiceService. */
export interface InvoiceServiceDeps extends BaseServiceDeps {
  readonly invoiceRepo: InvoiceRepository;
}

/** Valid status transitions for the invoice state machine. */
const ALLOWED_TRANSITIONS: Record<InvoiceStatus, ReadonlyArray<InvoiceStatus>> = {
  DRAFT: ["OPEN", "VOID"],
  OPEN: ["PAID", "VOID", "UNCOLLECTIBLE"],
  PAID: [],
  VOID: [],
  UNCOLLECTIBLE: ["VOID"],
};

function canTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return (ALLOWED_TRANSITIONS[from] as ReadonlyArray<InvoiceStatus>).includes(to);
}

function toOutput(invoice: Invoice): InvoiceOutput {
  return { ...invoice };
}

function toPageRequest(cursor?: string, limit?: number): PageRequest {
  return { limit: limit ?? 20, ...(cursor !== undefined ? { cursor } : {}) };
}

function castInvoice(value: unknown): Invoice {
  return value as Invoice;
}

function castInvoicePage(value: unknown): Page<Invoice> {
  return value as Page<Invoice>;
}

/** Application service for managing billing invoices. */
export class InvoiceService extends BaseService {
  private readonly invoiceRepo: InvoiceRepository;

  constructor(deps: InvoiceServiceDeps) {
    super(deps);
    this.invoiceRepo = deps.invoiceRepo;
  }

  /** Create a new invoice in DRAFT status for an organization. */
  async create(
    ctx: ServiceContext,
    input: CreateInvoiceInput,
  ): Promise<Result<InvoiceOutput, AppError>> {
    this.log(ctx, "info", "invoice.create", { organizationId: input.organizationId });
    return serviceCall(async () => {
      const result = await this.invoiceRepo.create(input);
      if (!isOk(result)) throw result.error;
      return toOutput(castInvoice(result.value));
    });
  }

  /** Retrieve a single invoice by its opaque ID. */
  async getById(
    ctx: ServiceContext,
    input: GetInvoiceInput,
  ): Promise<Result<InvoiceOutput, AppError>> {
    return serviceCall(async () => {
      const result = await this.invoiceRepo.findById(input.invoiceId);
      if (!isOk(result)) {
        throw new ResourceNotFoundError("Invoice", input.invoiceId);
      }
      return toOutput(castInvoice(result.value));
    });
  }

  /** Retrieve a single invoice by its human-readable invoice number. */
  async getByNumber(
    ctx: ServiceContext,
    input: GetInvoiceByNumberInput,
  ): Promise<Result<InvoiceOutput, AppError>> {
    return serviceCall(async () => {
      const result = await this.invoiceRepo.findByNumber(input.number);
      if (!isOk(result)) {
        throw new ResourceNotFoundError("Invoice", input.number);
      }
      return toOutput(castInvoice(result.value));
    });
  }

  /** List invoices with optional filtering by organization, subscription, or status. */
  async list(
    ctx: ServiceContext,
    input: ListInvoicesInput,
  ): Promise<Result<Page<InvoiceOutput>, AppError>> {
    return serviceCall(async () => {
      const pageReq = toPageRequest(input.cursor, input.limit);
      if (input.organizationId !== undefined) {
        const result = await this.invoiceRepo.findByOrganizationId(
          input.organizationId,
          { page: pageReq },
        );
        if (!isOk(result)) throw result.error;
        const page = castInvoicePage(result.value);
        return {
          ...page,
          items: page.items.map(toOutput),
        };
      }
      if (input.subscriptionId !== undefined) {
        const result = await this.invoiceRepo.findBySubscriptionId(
          input.subscriptionId,
          { page: pageReq },
        );
        if (!isOk(result)) throw result.error;
        const page = castInvoicePage(result.value);
        return {
          ...page,
          items: page.items.map(toOutput),
        };
      }
      if (input.status !== undefined) {
        const result = await this.invoiceRepo.findByStatus(
          input.status,
          { page: pageReq },
        );
        if (!isOk(result)) throw result.error;
        const page = castInvoicePage(result.value);
        return {
          ...page,
          items: page.items.map(toOutput),
        };
      }
      const result = await this.invoiceRepo.list({
        page: pageReq,
      });
      if (!isOk(result)) throw result.error;
      const page = castInvoicePage(result.value);
      return {
        ...page,
        items: page.items.map(toOutput),
      };
    });
  }

  /** Transition an invoice to a new status, enforcing the state machine. */
  async updateStatus(
    ctx: ServiceContext,
    invoiceId: string,
    input: UpdateInvoiceStatusInput,
  ): Promise<Result<InvoiceOutput, AppError>> {
    this.log(ctx, "info", "invoice.updateStatus", { invoiceId, status: input.status });
    return serviceCall(async () => {
      const existing = await this.invoiceRepo.findById(invoiceId);
      if (!isOk(existing)) {
        throw new ResourceNotFoundError("Invoice", invoiceId);
      }
      const current = castInvoice(existing.value).status;
      if (!canTransition(current, input.status)) {
        throw new PreconditionFailedError(
          `Cannot transition invoice from '${current}' to '${input.status}'.`,
        );
      }
      const paidAt =
        input.status === "PAID"
          ? (input.paidAt ?? this.now())
          : input.paidAt ?? null;
      const updated = await this.invoiceRepo.update(invoiceId, {
        status: input.status,
        paidAt,
      });
      if (!isOk(updated)) throw updated.error;
      return toOutput(castInvoice(updated.value));
    });
  }

  /** Void an invoice, preventing further payment. Requires admin role. */
  async void(
    ctx: ServiceContext,
    invoiceId: string,
  ): Promise<Result<InvoiceOutput, AppError>> {
    if (!ctx.principal.roles.includes("admin") && !ctx.principal.roles.includes("system")) {
      return err(new InsufficientPermissionsError("void invoice"));
    }
    return this.updateStatus(ctx, invoiceId, { status: "VOID" });
  }

  /** Mark an invoice as paid, recording the payment timestamp. */
  async markPaid(
    ctx: ServiceContext,
    invoiceId: string,
    paidAt?: string,
  ): Promise<Result<InvoiceOutput, AppError>> {
    return this.updateStatus(ctx, invoiceId, {
      status: "PAID",
      paidAt: paidAt ?? this.now(),
    });
  }

  /** Delete a draft invoice permanently. Only DRAFT invoices may be deleted. */
  async delete(
    ctx: ServiceContext,
    invoiceId: string,
  ): Promise<Result<void, AppError>> {
    this.log(ctx, "info", "invoice.delete", { invoiceId });
    return serviceCall(async () => {
      const existing = await this.invoiceRepo.findById(invoiceId);
      if (!isOk(existing)) {
        throw new ResourceNotFoundError("Invoice", invoiceId);
      }
      if (castInvoice(existing.value).status !== "DRAFT") {
        throw new PreconditionFailedError(
          "Only invoices in DRAFT status can be deleted.",
        );
      }
      const deleted = await this.invoiceRepo.delete(invoiceId);
      if (!isOk(deleted)) throw deleted.error;
      return undefined;
    });
  }
}
