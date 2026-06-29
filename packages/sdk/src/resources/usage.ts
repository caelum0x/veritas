// Usage resource client: query API usage metrics and consumption data.
import type { ApiResponse } from "@veritas/core";
import type { Transport } from "../http/transport.js";
import type { SdkConfig } from "../config.js";
import { buildRequest, toQueryParams } from "../http/request.js";
import { SdkHttpError } from "../http/errors.js";
import type { z } from "zod";
import { UsageSchema } from "@veritas/contracts";

export type Usage = z.infer<typeof UsageSchema>;

export interface ListUsageParams {
  organizationId?: string;
  userId?: string;
  metric?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface UsageSummary {
  totalRequests: number;
  totalTokens: number;
  totalCostUsdc: string;
  byMetric: Record<string, number>;
  periodStart: string;
  periodEnd: string;
}

export class UsageResource {
  constructor(
    private readonly transport: Transport,
    private readonly config: SdkConfig,
  ) {}

  async list(params?: ListUsageParams): Promise<Usage[]> {
    const query = toQueryParams({
      organizationId: params?.organizationId,
      userId: params?.userId,
      metric: params?.metric,
      from: params?.from,
      to: params?.to,
      page: params?.page,
      limit: params?.limit,
    });
    const req = buildRequest({ method: "GET", path: "/usage", query }, this.config);
    const result = await this.transport.request(req);
    if (result.ok) {
      const body = result.value.body as ApiResponse<Usage[]>;
      if ("data" in body && Array.isArray(body.data)) return body.data;
      return [];
    }
    throw result.error;
  }

  async summary(params?: { organizationId?: string; from?: string; to?: string }): Promise<UsageSummary> {
    const query = toQueryParams({
      organizationId: params?.organizationId,
      from: params?.from,
      to: params?.to,
    });
    const req = buildRequest({ method: "GET", path: "/usage/summary", query }, this.config);
    const result = await this.transport.request(req);
    if (result.ok) {
      const body = result.value.body as ApiResponse<UsageSummary>;
      if ("data" in body && body.data != null) return body.data;
      throw new SdkHttpError({ message: "Usage summary missing in response", code: "unknown", status: result.value.status });
    }
    throw result.error;
  }

  async getByMetric(metric: string, params?: { from?: string; to?: string }): Promise<Usage[]> {
    const query = toQueryParams({
      from: params?.from,
      to: params?.to,
    });
    const path = `/usage/metrics/${encodeURIComponent(metric)}`;
    const req = buildRequest({ method: "GET", path, query }, this.config);
    const result = await this.transport.request(req);
    if (result.ok) {
      const body = result.value.body as ApiResponse<Usage[]>;
      if ("data" in body && Array.isArray(body.data)) return body.data;
      return [];
    }
    throw result.error;
  }
}
