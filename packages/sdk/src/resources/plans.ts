// Plans resource client: list and retrieve available billing plans.
import type { ApiResponse } from "@veritas/core";
import type { Transport } from "../http/transport.js";
import type { SdkConfig } from "../config.js";
import { buildRequest, interpolatePath, toQueryParams } from "../http/request.js";
import { SdkHttpError } from "../http/errors.js";
import type { z } from "zod";
import { PlanSchema } from "@veritas/contracts";

export type Plan = z.infer<typeof PlanSchema>;

export interface ListPlansParams {
  active?: boolean;
  billingInterval?: string;
  page?: number;
  limit?: number;
}

export class PlansResource {
  constructor(
    private readonly transport: Transport,
    private readonly config: SdkConfig,
  ) {}

  async list(params?: ListPlansParams): Promise<Plan[]> {
    const query = toQueryParams({
      active: params?.active,
      billingInterval: params?.billingInterval,
      page: params?.page,
      limit: params?.limit,
    });
    const req = buildRequest({ method: "GET", path: "/plans", query }, this.config);
    const result = await this.transport.request(req);
    if (result.ok) {
      const body = result.value.body as ApiResponse<Plan[]>;
      if ("data" in body && Array.isArray(body.data)) return body.data;
      return [];
    }
    throw result.error;
  }

  async get(planId: string): Promise<Plan> {
    const path = interpolatePath("/plans/:planId", { planId });
    const req = buildRequest({ method: "GET", path }, this.config);
    const result = await this.transport.request(req);
    if (result.ok) {
      const body = result.value.body as ApiResponse<Plan>;
      if ("data" in body && body.data != null) return body.data;
      throw new SdkHttpError({ message: "Plan not found in response", code: "not_found", status: result.value.status });
    }
    throw result.error;
  }

  async getFeatures(planId: string): Promise<Record<string, unknown>> {
    const path = interpolatePath("/plans/:planId/features", { planId });
    const req = buildRequest({ method: "GET", path }, this.config);
    const result = await this.transport.request(req);
    if (result.ok) {
      const body = result.value.body as ApiResponse<Record<string, unknown>>;
      if ("data" in body && body.data != null) return body.data;
      return {};
    }
    throw result.error;
  }

  async compare(planIds: string[]): Promise<{ plans: Plan[]; comparison: Record<string, unknown[]> }> {
    const query = toQueryParams({ ids: planIds.join(",") });
    const req = buildRequest({ method: "GET", path: "/plans/compare", query }, this.config);
    const result = await this.transport.request(req);
    if (result.ok) {
      const body = result.value.body as ApiResponse<{ plans: Plan[]; comparison: Record<string, unknown[]> }>;
      if ("data" in body && body.data != null) return body.data;
      throw new SdkHttpError({ message: "Comparison data missing in response", code: "unknown", status: result.value.status });
    }
    throw result.error;
  }
}
