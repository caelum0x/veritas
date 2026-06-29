// Me resource client: retrieve and update the current authenticated user's profile, memberships, and sessions.
import type { ApiResponse } from "@veritas/core";
import type { Transport } from "../http/transport.js";
import type { SdkConfig } from "../config.js";
import { buildRequest, toQueryParams } from "../http/request.js";
import { SdkHttpError } from "../http/errors.js";
import type { z } from "zod";
import {
  UserSchema,
  UpdateUserSchema,
  MembershipSchema,
  SessionSchema,
} from "@veritas/contracts";

export type User = z.infer<typeof UserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type Membership = z.infer<typeof MembershipSchema>;
export type Session = z.infer<typeof SessionSchema>;

export interface ListMembershipsParams {
  page?: number;
  limit?: number;
}

export interface ListSessionsParams {
  page?: number;
  limit?: number;
}

export class MeResource {
  constructor(
    private readonly transport: Transport,
    private readonly config: SdkConfig,
  ) {}

  async get(): Promise<User> {
    const req = buildRequest({ method: "GET", path: "/me" }, this.config);
    const result = await this.transport.request(req);
    if (result.ok) {
      const body = result.value.body as ApiResponse<User>;
      if ("data" in body && body.data != null) return body.data;
      throw new SdkHttpError({ message: "User data missing in response", code: "unknown", status: result.value.status });
    }
    throw result.error;
  }

  async update(input: UpdateUserInput): Promise<User> {
    const req = buildRequest({ method: "PATCH", path: "/me", body: input }, this.config);
    const result = await this.transport.request(req);
    if (result.ok) {
      const body = result.value.body as ApiResponse<User>;
      if ("data" in body && body.data != null) return body.data;
      throw new SdkHttpError({ message: "Updated user data missing in response", code: "unknown", status: result.value.status });
    }
    throw result.error;
  }

  async deleteAccount(): Promise<void> {
    const req = buildRequest({ method: "DELETE", path: "/me" }, this.config);
    const result = await this.transport.request(req);
    if (!result.ok) throw result.error;
  }

  async listMemberships(params?: ListMembershipsParams): Promise<Membership[]> {
    const query = toQueryParams({
      page: params?.page,
      limit: params?.limit,
    });
    const req = buildRequest({ method: "GET", path: "/me/memberships", query }, this.config);
    const result = await this.transport.request(req);
    if (result.ok) {
      const body = result.value.body as ApiResponse<Membership[]>;
      if ("data" in body && Array.isArray(body.data)) return body.data;
      return [];
    }
    throw result.error;
  }

  async listSessions(params?: ListSessionsParams): Promise<Session[]> {
    const query = toQueryParams({
      page: params?.page,
      limit: params?.limit,
    });
    const req = buildRequest({ method: "GET", path: "/me/sessions", query }, this.config);
    const result = await this.transport.request(req);
    if (result.ok) {
      const body = result.value.body as ApiResponse<Session[]>;
      if ("data" in body && Array.isArray(body.data)) return body.data;
      return [];
    }
    throw result.error;
  }

  async revokeSession(sessionId: string): Promise<void> {
    const req = buildRequest(
      { method: "DELETE", path: `/me/sessions/${encodeURIComponent(sessionId)}` },
      this.config,
    );
    const result = await this.transport.request(req);
    if (!result.ok) throw result.error;
  }

  async revokeAllSessions(): Promise<void> {
    const req = buildRequest({ method: "DELETE", path: "/me/sessions" }, this.config);
    const result = await this.transport.request(req);
    if (!result.ok) throw result.error;
  }
}
