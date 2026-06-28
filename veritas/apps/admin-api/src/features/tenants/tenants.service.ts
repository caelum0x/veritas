// Tenant feature service — delegates org CRUD and ownership ops to OrganizationService.
import type { Deps } from "../../container.js";
import type { ServiceContext } from "@veritas/services";
import type {
  OrganizationOutput,
} from "@veritas/services";
import type { AppError } from "@veritas/services";
import type { Result } from "@veritas/services";
import type { CreateTenantBody, UpdateTenantBody, ListTenantsQuery } from "./tenants.schema.js";

export type { OrganizationOutput };

export interface TenantListResult {
  readonly items: OrganizationOutput[];
  readonly nextCursor: string | null;
  readonly total: number;
}

/** Admin-API tenant service: wraps @veritas/services OrganizationService. */
export class TenantsService {
  private readonly orgService: Deps["orgService"];
  private readonly auditLogService: Deps["auditLogService"];

  constructor(deps: Pick<Deps, "orgService" | "auditLogService">) {
    this.orgService = deps.orgService;
    this.auditLogService = deps.auditLogService;
  }

  async create(
    ctx: ServiceContext,
    body: CreateTenantBody,
  ): Promise<Result<OrganizationOutput, AppError>> {
    const result = await this.orgService.createOrganization(ctx, {
      slug: body.slug,
      name: body.name,
      ownerId: body.ownerId,
      billingEmail: body.billingEmail ?? null,
      metadata: body.metadata,
    });
    if (result.ok) {
      await this.auditLogService.append(ctx, {
        action: "tenant.created",
        actorId: ctx.principal.userId,
        actorType: "user",
        resourceType: "organization",
        resourceId: result.value.id,
        orgId: result.value.id,
      } as never);
    }
    return result;
  }

  async getById(
    ctx: ServiceContext,
    orgId: string,
  ): Promise<Result<OrganizationOutput, AppError>> {
    return this.orgService.getOrganization(ctx, orgId);
  }

  async update(
    ctx: ServiceContext,
    orgId: string,
    body: UpdateTenantBody,
  ): Promise<Result<OrganizationOutput, AppError>> {
    const result = await this.orgService.updateOrganization(ctx, orgId, {
      name: body.name,
      billingEmail: body.billingEmail,
      metadata: body.metadata,
    });
    if (result.ok) {
      await this.auditLogService.append(ctx, {
        action: "tenant.updated",
        actorId: ctx.principal.userId,
        actorType: "user",
        resourceType: "organization",
        resourceId: orgId,
        orgId,
      } as never);
    }
    return result;
  }

  async list(
    ctx: ServiceContext,
    query: ListTenantsQuery,
  ): Promise<Result<TenantListResult, AppError>> {
    return this.orgService.listOrganizations(ctx, {
      ownerId: query.ownerId,
      slug: query.slug,
      limit: query.limit,
      cursor: query.cursor,
    });
  }

  async transferOwnership(
    ctx: ServiceContext,
    orgId: string,
    newOwnerId: string,
  ): Promise<Result<OrganizationOutput, AppError>> {
    const result = await this.orgService.transferOwnership(ctx, {
      organizationId: orgId,
      newOwnerId,
    });
    if (result.ok) {
      await this.auditLogService.append(ctx, {
        action: "tenant.ownershipTransferred",
        actorId: ctx.principal.userId,
        actorType: "user",
        resourceType: "organization",
        resourceId: orgId,
        orgId,
        metadata: { newOwnerId },
      } as never);
    }
    return result;
  }

  async delete(
    ctx: ServiceContext,
    orgId: string,
  ): Promise<Result<void, AppError>> {
    const result = await this.orgService.deleteOrganization(ctx, orgId);
    if (result.ok) {
      await this.auditLogService.append(ctx, {
        action: "tenant.deleted",
        actorId: ctx.principal.userId,
        actorType: "user",
        resourceType: "organization",
        resourceId: orgId,
        orgId,
      } as never);
    }
    return result;
  }
}
