// Agents resource client for registering and managing CAP agent records.
import type { z } from "zod";
import type { Transport } from "../http/transport.js";
import type { SdkConfig } from "../config.js";
import { AgentSchema, CreateAgentSchema, UpdateAgentSchema } from "@veritas/contracts";
import type { ApiResponse, ApiPage } from "@veritas/core";

export type Agent = z.infer<typeof AgentSchema>;
export type CreateAgent = z.infer<typeof CreateAgentSchema>;
export type UpdateAgent = z.infer<typeof UpdateAgentSchema>;

export interface ListAgentsParams {
  limit?: number;
  cursor?: string;
}

export class AgentsResource {
  constructor(
    private readonly transport: Transport,
    private readonly _config: SdkConfig,
  ) {}

  /** Retrieve a single agent by ID. */
  async get(agentId: string): Promise<ApiResponse<Agent>> {
    const result = await this.transport.request({
      method: "GET",
      path: `/agents/${encodeURIComponent(agentId)}`,
    });

    if (result.ok) {
      return result.value.body as ApiResponse<Agent>;
    }
    throw result.error;
  }

  /** List registered agents. */
  async list(params?: ListAgentsParams): Promise<ApiPage<Agent>> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.limit !== undefined) query["limit"] = params.limit;
    if (params?.cursor) query["cursor"] = params.cursor;

    const result = await this.transport.request({
      method: "GET",
      path: "/agents",
      query,
    });

    if (result.ok) {
      return result.value.body as ApiPage<Agent>;
    }
    throw result.error;
  }

  /** Register a new agent. */
  async create(data: CreateAgent): Promise<ApiResponse<Agent>> {
    const body = CreateAgentSchema.parse(data);

    const result = await this.transport.request({
      method: "POST",
      path: "/agents",
      body,
    });

    if (result.ok) {
      return result.value.body as ApiResponse<Agent>;
    }
    throw result.error;
  }

  /** Update an existing agent. */
  async update(agentId: string, data: UpdateAgent): Promise<ApiResponse<Agent>> {
    const body = UpdateAgentSchema.parse(data);

    const result = await this.transport.request({
      method: "PATCH",
      path: `/agents/${encodeURIComponent(agentId)}`,
      body,
    });

    if (result.ok) {
      return result.value.body as ApiResponse<Agent>;
    }
    throw result.error;
  }

  /** Deregister an agent. */
  async delete(agentId: string): Promise<ApiResponse<void>> {
    const result = await this.transport.request({
      method: "DELETE",
      path: `/agents/${encodeURIComponent(agentId)}`,
    });

    if (result.ok) {
      return result.value.body as ApiResponse<void>;
    }
    throw result.error;
  }
}
