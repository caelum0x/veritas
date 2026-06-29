// Invoices resource client: retrieve and manage billing invoices.
import type { ApiResponse } from "@veritas/core";
import type { Transport } from "../http/transport.js";
import type { SdkConfig } from "../config.js";
import { buildRequest, interpolatePath, toQueryParams } from "../http/request.js";
import { SdkHttpError } from "../http/errors.js";
import type { z } from "zod";
import { InvoiceSchema } from "@veritas/contracts";

export type Invoice = z.infer<typeof InvoiceSchema>;

export interface ListInvoicesParams {
  organizationId?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export class InvoicesResource {
  constructor(
    private readonly transport: Transport,
    private readonly config: SdkConfig,
  ) {}

  async list(params?: ListInvoicesParams): Promise<Invoice[]> {
    const query = toQueryParams({
      organizationId: params?.organizationId,
      status: params?.status,
      from: params?.from,
      to: params?.to,
      page: params?.page,
      limit: params?.limit,
    });
    const req = buildRequest({ method: "GET", path: "/invoices", query }, this.config);
    const result = await this.transport.request(req);
    if (result.ok) {
      const body = result.value.body as ApiResponse<Invoice[]>;
      if ("data" in body && Array.isArray(body.data)) return body.data;
      return [];
    }
    throw result.error;
  }

  async get(invoiceId: string): Promise<Invoice> {
    const path = interpolatePath("/invoices/:invoiceId", { invoiceId });
    const req = buildRequest({ method: "GET", path }, this.config);
    const result = await this.transport.request(req);
    if (result.ok) {
      const body = result.value.body as ApiResponse<Invoice>;
      if ("data" in body && body.data != null) return body.data;
      throw new SdkHttpError({ message: "Invoice not found in response", code: "not_found", status: result.value.status });
    }
    throw result.error;
  }

  async download(invoiceId: string): Promise<{ url: string; expiresAt: string }> {
    const path = interpolatePath("/invoices/:invoiceId/download", { invoiceId });
    const req = buildRequest({ method: "GET", path }, this.config);
    const result = await this.transport.request(req);
    if (result.ok) {
      const body = result.value.body as ApiResponse<{ url: string; expiresAt: string }>;
      if ("data" in body && body.data != null) return body.data;
      throw new SdkHttpError({ message: "Download URL missing in response", code: "unknown", status: result.value.status });
    }
    throw result.error;
  }

  async pay(invoiceId: string, walletId: string): Promise<Invoice> {
    const path = interpolatePath("/invoices/:invoiceId/pay", { invoiceId });
    const req = buildRequest({ method: "POST", path, body: { walletId } }, this.config);
    const result = await this.transport.request(req);
    if (result.ok) {
      const body = result.value.body as ApiResponse<Invoice>;
      if ("data" in body && body.data != null) return body.data;
      throw new SdkHttpError({ message: "Invoice data missing after payment", code: "unknown", status: result.value.status });
    }
    throw result.error;
  }
}
