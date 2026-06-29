// Organization application service: create, retrieve, update, list, and manage tenant orgs.
import {
  Result,
  AppError,
  newId,
} from "@veritas/core";
import type { ServiceContext } from "../service-context.js";
import { BaseService, type BaseServiceDeps } from "../base-service.js";
import { serviceCall } from "../result.js";
import {
  ResourceNotFoundError,
  DuplicateResourceError,
  InsufficientPermissionsError,
  PreconditionFailedError,
} from "../errors.js";
import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  ListOrganizationsInput,
  TransferOwnershipInput,
  OrganizationOutput,
  OrganizationListOutput,
} from "./organization.dto.js";
import { toOrganizationOutput } from "./organization.dto.js";

/** Minimal repository interface expected by OrganizationService. */
export interface OrganizationRepository {
  findById(id: string): Promise<OrganizationOutput | null>;
  findBySlug(slug: string): Promise<OrganizationOutput | null>;
  list(opts: {
    ownerId?: string;
    slug?: string;
    limit: number;
    cursor?: string;
  }): Promise<{ items: OrganizationOutput[]; nextCursor: string | null; total: number }>;
  create(org: OrganizationOutput): Promise<OrganizationOutput>;
  update(id: string, patch: Partial<OrganizationOutput>): Promise<OrganizationOutput | null>;
  delete(id: string): Promise<boolean>;
}

export interface OrganizationServiceDeps extends BaseServiceDeps {
  readonly orgRepo: OrganizationRepository;
}

/** Application service for managing platform organizations (tenants). */
export class OrganizationService extends BaseService {
  private readonly orgRepo: OrganizationRepository;

  constructor(deps: OrganizationServiceDeps) {
    super(deps);
    this.orgRepo = deps.orgRepo;
  }

  /** Create a new organization; slug must be globally unique. */
  async createOrganization(
    ctx: ServiceContext,
    input: CreateOrganizationInput,
  ): Promise<Result<OrganizationOutput, AppError>> {
    return serviceCall(async () => {
      const existing = await this.orgRepo.findBySlug(input.slug);
      if (existing) {
        throw new DuplicateResourceError("Organization", "slug", input.slug);
      }
      const now = this.now();
      const org: OrganizationOutput = {
        id: newId("org"),
        slug: input.slug,
        name: input.name,
        ownerId: input.ownerId,
        billingEmail: input.billingEmail ?? null,
        metadata: input.metadata,
        createdAt: now,
        updatedAt: now,
      };
      const created = await this.orgRepo.create(org);
      this.log(ctx, "info", "org.created", { orgId: created.id, slug: created.slug });
      return toOrganizationOutput(created);
    });
  }

  /** Retrieve a single organization by ID. */
  async getOrganization(
    ctx: ServiceContext,
    orgId: string,
  ): Promise<Result<OrganizationOutput, AppError>> {
    return serviceCall(async () => {
      const org = await this.orgRepo.findById(orgId);
      if (!org) throw new ResourceNotFoundError("Organization", orgId);
      this.log(ctx, "debug", "org.fetched", { orgId });
      return toOrganizationOutput(org);
    });
  }

  /** Retrieve an organization by its unique slug. */
  async getOrganizationBySlug(
    ctx: ServiceContext,
    slug: string,
  ): Promise<Result<OrganizationOutput, AppError>> {
    return serviceCall(async () => {
      const org = await this.orgRepo.findBySlug(slug);
      if (!org) throw new ResourceNotFoundError("Organization", slug);
      this.log(ctx, "debug", "org.fetchedBySlug", { slug });
      return toOrganizationOutput(org);
    });
  }

  /** Update mutable fields on an organization (owner or admin only). */
  async updateOrganization(
    ctx: ServiceContext,
    orgId: string,
    input: UpdateOrganizationInput,
  ): Promise<Result<OrganizationOutput, AppError>> {
    return serviceCall(async () => {
      const existing = await this.orgRepo.findById(orgId);
      if (!existing) throw new ResourceNotFoundError("Organization", orgId);

      const isOwner = ctx.principal.userId === existing.ownerId;
      const isAdmin = ctx.principal.roles.includes("admin") || ctx.principal.roles.includes("system");
      if (!isOwner && !isAdmin) {
        throw new InsufficientPermissionsError("update organization");
      }

      const patch: Partial<OrganizationOutput> = { ...input, updatedAt: this.now() };
      const updated = await this.orgRepo.update(orgId, patch);
      if (!updated) throw new ResourceNotFoundError("Organization", orgId);
      this.log(ctx, "info", "org.updated", { orgId });
      return toOrganizationOutput(updated);
    });
  }

  /** List organizations with optional filters. */
  async listOrganizations(
    ctx: ServiceContext,
    input: ListOrganizationsInput,
  ): Promise<Result<OrganizationListOutput, AppError>> {
    return serviceCall(async () => {
      const isAdmin = ctx.principal.roles.includes("admin") || ctx.principal.roles.includes("system");
      if (!isAdmin) {
        throw new InsufficientPermissionsError("list organizations");
      }
      const limit = input.limit ?? 20;
      const result = await this.orgRepo.list({
        ownerId: input.ownerId,
        slug: input.slug,
        limit,
        cursor: input.cursor,
      });
      this.log(ctx, "debug", "org.listed", { total: result.total });
      return result;
    });
  }

  /** Transfer ownership of an organization to another user. */
  async transferOwnership(
    ctx: ServiceContext,
    input: TransferOwnershipInput,
  ): Promise<Result<OrganizationOutput, AppError>> {
    return serviceCall(async () => {
      const existing = await this.orgRepo.findById(input.organizationId);
      if (!existing) {
        throw new ResourceNotFoundError("Organization", input.organizationId);
      }
      const isOwner = ctx.principal.userId === existing.ownerId;
      const isAdmin = ctx.principal.roles.includes("admin") || ctx.principal.roles.includes("system");
      if (!isOwner && !isAdmin) {
        throw new InsufficientPermissionsError("transfer organization ownership");
      }
      if (existing.ownerId === input.newOwnerId) {
        throw new PreconditionFailedError("New owner is already the current owner.");
      }
      const patch: Partial<OrganizationOutput> = {
        ownerId: input.newOwnerId,
        updatedAt: this.now(),
      };
      const updated = await this.orgRepo.update(input.organizationId, patch);
      if (!updated) {
        throw new ResourceNotFoundError("Organization", input.organizationId);
      }
      this.log(ctx, "info", "org.ownershipTransferred", {
        orgId: input.organizationId,
        newOwnerId: input.newOwnerId,
      });
      return toOrganizationOutput(updated);
    });
  }

  /** Delete an organization (admin-only hard delete). */
  async deleteOrganization(
    ctx: ServiceContext,
    orgId: string,
  ): Promise<Result<void, AppError>> {
    return serviceCall(async () => {
      const isAdmin = ctx.principal.roles.includes("admin") || ctx.principal.roles.includes("system");
      if (!isAdmin) {
        throw new InsufficientPermissionsError("delete organization");
      }
      const existing = await this.orgRepo.findById(orgId);
      if (!existing) throw new ResourceNotFoundError("Organization", orgId);

      const deleted = await this.orgRepo.delete(orgId);
      if (!deleted) throw new ResourceNotFoundError("Organization", orgId);
      this.log(ctx, "info", "org.deleted", { orgId });
    });
  }
}
