// Verification resource client for submitting and retrieving fact-verification requests.
import type { z } from "zod";
import type { Transport } from "../http/transport.js";
import type { SdkConfig } from "../config.js";
import {
  VerificationRequestSchema,
  VerificationOptionsSchema,
  VerificationReportSchema,
} from "@veritas/contracts";
import type { ApiResponse, ApiPage } from "@veritas/core";

export type VerificationRequest = z.infer<typeof VerificationRequestSchema>;
export type VerificationOptions = z.infer<typeof VerificationOptionsSchema>;
export type VerificationReport = z.infer<typeof VerificationReportSchema>;

export interface ListVerificationsParams {
  claimId?: string;
  limit?: number;
  cursor?: string;
}

export class VerificationResource {
  constructor(
    private readonly transport: Transport,
    private readonly _config: SdkConfig,
  ) {}

  /** Submit a new verification request and receive a report. */
  async submit(
    request: VerificationRequest,
    options?: Partial<VerificationOptions>,
  ): Promise<ApiResponse<VerificationReport>> {
    const body = {
      ...VerificationRequestSchema.parse(request),
      options: options ? VerificationOptionsSchema.partial().parse(options) : undefined,
    };

    const result = await this.transport.request({
      method: "POST",
      path: "/verifications",
      body,
    });

    if (result.ok) {
      return result.value.body as ApiResponse<VerificationReport>;
    }
    throw result.error;
  }

  /** Retrieve a single verification report by its ID. */
  async get(verificationId: string): Promise<ApiResponse<VerificationReport>> {
    const result = await this.transport.request({
      method: "GET",
      path: `/verifications/${encodeURIComponent(verificationId)}`,
    });

    if (result.ok) {
      return result.value.body as ApiResponse<VerificationReport>;
    }
    throw result.error;
  }

  /** List verification reports with optional filtering. */
  async list(params?: ListVerificationsParams): Promise<ApiPage<VerificationReport>> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.claimId) query["claimId"] = params.claimId;
    if (params?.limit !== undefined) query["limit"] = params.limit;
    if (params?.cursor) query["cursor"] = params.cursor;

    const result = await this.transport.request({
      method: "GET",
      path: "/verifications",
      query,
    });

    if (result.ok) {
      return result.value.body as ApiPage<VerificationReport>;
    }
    throw result.error;
  }
}
