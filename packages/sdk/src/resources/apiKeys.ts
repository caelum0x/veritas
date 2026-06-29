// ApiKeys resource client for managing API key credentials.
import type { z } from "zod";
import type { Transport } from "../http/transport.js";
import type { SdkConfig } from "../config.js";
import {
  ApiKeySchema,
  CreateApiKeySchema,
  ApiKeyWithSecretSchema,
} from "@veritas/contracts";
import type { ApiResponse, ApiPage } from "@veritas/core";

export type ApiKey = z.infer<typeof ApiKeySchema>;
export type CreateApiKey = z.infer<typeof CreateApiKeySchema>;
export type ApiKeyWithSecret = z.infer<typeof ApiKeyWithSecretSchema>;

export interface ListApiKeysParams {
  limit?: number;
  cursor?: string;
}

export class ApiKeysResource {
  constructor(
    private readonly transport: Transport,
    private readonly _config: SdkConfig,
  ) {}

  /**
   * Create a new API key. Returns the key with its secret — the secret is
   * only available at creation time and cannot be retrieved again.
   */
  async create(data: CreateApiKey): Promise<ApiResponse<ApiKeyWithSecret>> {
    const body = CreateApiKeySchema.parse(data);
    const result = await this.transport.request({
      method: "POST",
      path: "/api-keys",
      body,
    });
    if (result.ok) return result.value.body as ApiResponse<ApiKeyWithSecret>;
    throw result.error;
  }

  /** Retrieve metadata for a single API key by ID (secret is never returned). */
  async get(apiKeyId: string): Promise<ApiResponse<ApiKey>> {
    const result = await this.transport.request({
      method: "GET",
      path: `/api-keys/${encodeURIComponent(apiKeyId)}`,
    });
    if (result.ok) return result.value.body as ApiResponse<ApiKey>;
    throw result.error;
  }

  /** List all API keys for the authenticated organization. */
  async list(params?: ListApiKeysParams): Promise<ApiPage<ApiKey>> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.limit !== undefined) query["limit"] = params.limit;
    if (params?.cursor) query["cursor"] = params.cursor;
    const result = await this.transport.request({
      method: "GET",
      path: "/api-keys",
      query,
    });
    if (result.ok) return result.value.body as ApiPage<ApiKey>;
    throw result.error;
  }

  /** Revoke (delete) an API key, immediately invalidating it. */
  async revoke(apiKeyId: string): Promise<ApiResponse<null>> {
    const result = await this.transport.request({
      method: "DELETE",
      path: `/api-keys/${encodeURIComponent(apiKeyId)}`,
    });
    if (result.ok) return result.value.body as ApiResponse<null>;
    throw result.error;
  }
}
