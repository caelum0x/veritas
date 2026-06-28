// Reports resource client for retrieving and managing verification report records.
import type { z } from "zod";
import type { Transport } from "../http/transport.js";
import type { SdkConfig } from "../config.js";
import { ReportSchema, CreateReportSchema } from "@veritas/contracts";
import type { ApiResponse, ApiPage } from "@veritas/core";

export type Report = z.infer<typeof ReportSchema>;
export type CreateReport = z.infer<typeof CreateReportSchema>;

export interface ListReportsParams {
  claimId?: string;
  limit?: number;
  cursor?: string;
}

export class ReportsResource {
  constructor(
    private readonly transport: Transport,
    private readonly _config: SdkConfig,
  ) {}

  /** Retrieve a single report by ID. */
  async get(reportId: string): Promise<ApiResponse<Report>> {
    const result = await this.transport.request({
      method: "GET",
      path: `/reports/${encodeURIComponent(reportId)}`,
    });

    if (result.ok) {
      return result.value.body as ApiResponse<Report>;
    }
    throw result.error;
  }

  /** List reports with optional filtering. */
  async list(params?: ListReportsParams): Promise<ApiPage<Report>> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.claimId) query["claimId"] = params.claimId;
    if (params?.limit !== undefined) query["limit"] = params.limit;
    if (params?.cursor) query["cursor"] = params.cursor;

    const result = await this.transport.request({
      method: "GET",
      path: "/reports",
      query,
    });

    if (result.ok) {
      return result.value.body as ApiPage<Report>;
    }
    throw result.error;
  }

  /** Create a new report manually (admin use). */
  async create(data: CreateReport): Promise<ApiResponse<Report>> {
    const body = CreateReportSchema.parse(data);

    const result = await this.transport.request({
      method: "POST",
      path: "/reports",
      body,
    });

    if (result.ok) {
      return result.value.body as ApiResponse<Report>;
    }
    throw result.error;
  }

  /** Delete a report by ID. */
  async delete(reportId: string): Promise<ApiResponse<void>> {
    const result = await this.transport.request({
      method: "DELETE",
      path: `/reports/${encodeURIComponent(reportId)}`,
    });

    if (result.ok) {
      return result.value.body as ApiResponse<void>;
    }
    throw result.error;
  }
}
