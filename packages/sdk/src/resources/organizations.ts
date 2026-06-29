// Organizations resource client for managing orgs, members, and memberships.
import type { z } from "zod";
import type { Transport } from "../http/transport.js";
import type { SdkConfig } from "../config.js";
import {
  OrganizationSchema,
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
  MembershipSchema,
  CreateMembershipSchema,
  UpdateMembershipSchema,
} from "@veritas/contracts";
import type { ApiResponse, ApiPage } from "@veritas/core";

export type Organization = z.infer<typeof OrganizationSchema>;
export type CreateOrganization = z.infer<typeof CreateOrganizationSchema>;
export type UpdateOrganization = z.infer<typeof UpdateOrganizationSchema>;
export type Membership = z.infer<typeof MembershipSchema>;
export type CreateMembership = z.infer<typeof CreateMembershipSchema>;
export type UpdateMembership = z.infer<typeof UpdateMembershipSchema>;

export interface ListOrganizationsParams {
  limit?: number;
  cursor?: string;
}

export interface ListMembersParams {
  limit?: number;
  cursor?: string;
  role?: string;
}

export class OrganizationsResource {
  constructor(
    private readonly transport: Transport,
    private readonly _config: SdkConfig,
  ) {}

  /** Create a new organization. */
  async create(data: CreateOrganization): Promise<ApiResponse<Organization>> {
    const body = CreateOrganizationSchema.parse(data);
    const result = await this.transport.request({
      method: "POST",
      path: "/organizations",
      body,
    });
    if (result.ok) return result.value.body as ApiResponse<Organization>;
    throw result.error;
  }

  /** Retrieve a single organization by ID. */
  async get(orgId: string): Promise<ApiResponse<Organization>> {
    const result = await this.transport.request({
      method: "GET",
      path: `/organizations/${encodeURIComponent(orgId)}`,
    });
    if (result.ok) return result.value.body as ApiResponse<Organization>;
    throw result.error;
  }

  /** Update an existing organization's details. */
  async update(orgId: string, data: UpdateOrganization): Promise<ApiResponse<Organization>> {
    const body = UpdateOrganizationSchema.parse(data);
    const result = await this.transport.request({
      method: "PATCH",
      path: `/organizations/${encodeURIComponent(orgId)}`,
      body,
    });
    if (result.ok) return result.value.body as ApiResponse<Organization>;
    throw result.error;
  }

  /** Delete an organization. */
  async delete(orgId: string): Promise<ApiResponse<null>> {
    const result = await this.transport.request({
      method: "DELETE",
      path: `/organizations/${encodeURIComponent(orgId)}`,
    });
    if (result.ok) return result.value.body as ApiResponse<null>;
    throw result.error;
  }

  /** List all organizations accessible to the authenticated user. */
  async list(params?: ListOrganizationsParams): Promise<ApiPage<Organization>> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.limit !== undefined) query["limit"] = params.limit;
    if (params?.cursor) query["cursor"] = params.cursor;
    const result = await this.transport.request({
      method: "GET",
      path: "/organizations",
      query,
    });
    if (result.ok) return result.value.body as ApiPage<Organization>;
    throw result.error;
  }

  /** List members of an organization. */
  async listMembers(orgId: string, params?: ListMembersParams): Promise<ApiPage<Membership>> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.limit !== undefined) query["limit"] = params.limit;
    if (params?.cursor) query["cursor"] = params.cursor;
    if (params?.role) query["role"] = params.role;
    const result = await this.transport.request({
      method: "GET",
      path: `/organizations/${encodeURIComponent(orgId)}/members`,
      query,
    });
    if (result.ok) return result.value.body as ApiPage<Membership>;
    throw result.error;
  }

  /** Add a member to an organization. */
  async addMember(orgId: string, data: CreateMembership): Promise<ApiResponse<Membership>> {
    const body = CreateMembershipSchema.parse(data);
    const result = await this.transport.request({
      method: "POST",
      path: `/organizations/${encodeURIComponent(orgId)}/members`,
      body,
    });
    if (result.ok) return result.value.body as ApiResponse<Membership>;
    throw result.error;
  }

  /** Update a member's role within an organization. */
  async updateMember(
    orgId: string,
    userId: string,
    data: UpdateMembership,
  ): Promise<ApiResponse<Membership>> {
    const body = UpdateMembershipSchema.parse(data);
    const result = await this.transport.request({
      method: "PATCH",
      path: `/organizations/${encodeURIComponent(orgId)}/members/${encodeURIComponent(userId)}`,
      body,
    });
    if (result.ok) return result.value.body as ApiResponse<Membership>;
    throw result.error;
  }

  /** Remove a member from an organization. */
  async removeMember(orgId: string, userId: string): Promise<ApiResponse<null>> {
    const result = await this.transport.request({
      method: "DELETE",
      path: `/organizations/${encodeURIComponent(orgId)}/members/${encodeURIComponent(userId)}`,
    });
    if (result.ok) return result.value.body as ApiResponse<null>;
    throw result.error;
  }
}
