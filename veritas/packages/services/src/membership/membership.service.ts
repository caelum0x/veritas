// Membership application service: invite, accept, update roles, and remove org members.
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
  CreateMembershipInput,
  UpdateMembershipInput,
  ListMembershipsInput,
  AcceptMembershipInput,
  ChangeMembershipRoleInput,
  MembershipOutput,
  MembershipListOutput,
} from "./membership.dto.js";
import { toMembershipOutput } from "./membership.dto.js";

/** Minimal repository interface expected by MembershipService. */
export interface MembershipRepository {
  findById(id: string): Promise<MembershipOutput | null>;
  findByOrgAndUser(orgId: string, userId: string): Promise<MembershipOutput | null>;
  list(opts: {
    organizationId?: string;
    userId?: string;
    role?: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
    limit: number;
    cursor?: string;
  }): Promise<{ items: MembershipOutput[]; nextCursor: string | null; total: number }>;
  create(membership: MembershipOutput): Promise<MembershipOutput>;
  update(id: string, patch: Partial<MembershipOutput>): Promise<MembershipOutput | null>;
  delete(id: string): Promise<boolean>;
}

export interface MembershipServiceDeps extends BaseServiceDeps {
  readonly membershipRepo: MembershipRepository;
}

/** Application service for managing organization memberships. */
export class MembershipService extends BaseService {
  private readonly membershipRepo: MembershipRepository;

  constructor(deps: MembershipServiceDeps) {
    super(deps);
    this.membershipRepo = deps.membershipRepo;
  }

  /** Invite a user to an organization; fails if membership already exists. */
  async createMembership(
    ctx: ServiceContext,
    input: CreateMembershipInput,
  ): Promise<Result<MembershipOutput, AppError>> {
    return serviceCall(async () => {
      const existing = await this.membershipRepo.findByOrgAndUser(
        input.organizationId,
        input.userId,
      );
      if (existing) {
        throw new DuplicateResourceError(
          "Membership",
          "userId in organization",
          `${input.userId}@${input.organizationId}`,
        );
      }

      const isAdmin = ctx.principal.roles.includes("admin") || ctx.principal.roles.includes("system");
      const isOrgMember = ctx.principal.orgId === input.organizationId;
      if (!isAdmin && !isOrgMember) {
        throw new InsufficientPermissionsError("invite organization member");
      }

      const now = this.now();
      const membership: MembershipOutput = {
        id: newId("mbr"),
        organizationId: input.organizationId,
        userId: input.userId,
        role: input.role,
        invitedBy: input.invitedBy ?? null,
        acceptedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      const created = await this.membershipRepo.create(membership);
      this.log(ctx, "info", "membership.created", {
        membershipId: created.id,
        orgId: created.organizationId,
        userId: created.userId,
        role: created.role,
      });
      return toMembershipOutput(created);
    });
  }

  /** Retrieve a single membership record by ID. */
  async getMembership(
    ctx: ServiceContext,
    membershipId: string,
  ): Promise<Result<MembershipOutput, AppError>> {
    return serviceCall(async () => {
      const membership = await this.membershipRepo.findById(membershipId);
      if (!membership) throw new ResourceNotFoundError("Membership", membershipId);
      this.log(ctx, "debug", "membership.fetched", { membershipId });
      return toMembershipOutput(membership);
    });
  }

  /** Update a membership record (role or acceptance state). */
  async updateMembership(
    ctx: ServiceContext,
    membershipId: string,
    input: UpdateMembershipInput,
  ): Promise<Result<MembershipOutput, AppError>> {
    return serviceCall(async () => {
      const existing = await this.membershipRepo.findById(membershipId);
      if (!existing) throw new ResourceNotFoundError("Membership", membershipId);

      const isAdmin = ctx.principal.roles.includes("admin") || ctx.principal.roles.includes("system");
      const isOrgMember = ctx.principal.orgId === existing.organizationId;
      if (!isAdmin && !isOrgMember) {
        throw new InsufficientPermissionsError("update membership");
      }

      const patch: Partial<MembershipOutput> = { ...input, updatedAt: this.now() };
      const updated = await this.membershipRepo.update(membershipId, patch);
      if (!updated) throw new ResourceNotFoundError("Membership", membershipId);
      this.log(ctx, "info", "membership.updated", { membershipId });
      return toMembershipOutput(updated);
    });
  }

  /** Accept a pending membership invitation for the calling user. */
  async acceptMembership(
    ctx: ServiceContext,
    input: AcceptMembershipInput,
  ): Promise<Result<MembershipOutput, AppError>> {
    return serviceCall(async () => {
      const existing = await this.membershipRepo.findById(input.membershipId);
      if (!existing) throw new ResourceNotFoundError("Membership", input.membershipId);

      if (existing.userId !== ctx.principal.userId) {
        throw new InsufficientPermissionsError("accept this membership invitation");
      }
      if (existing.acceptedAt !== null) {
        throw new PreconditionFailedError("Membership invitation has already been accepted.");
      }

      const now = this.now();
      const acceptedAt = input.acceptedAt ?? now;
      const updated = await this.membershipRepo.update(input.membershipId, {
        acceptedAt,
        updatedAt: now,
      });
      if (!updated) throw new ResourceNotFoundError("Membership", input.membershipId);
      this.log(ctx, "info", "membership.accepted", {
        membershipId: input.membershipId,
        userId: existing.userId,
        orgId: existing.organizationId,
      });
      return toMembershipOutput(updated);
    });
  }

  /** Change the role assigned to a member within an organization. */
  async changeMembershipRole(
    ctx: ServiceContext,
    input: ChangeMembershipRoleInput,
  ): Promise<Result<MembershipOutput, AppError>> {
    return serviceCall(async () => {
      const existing = await this.membershipRepo.findById(input.membershipId);
      if (!existing) throw new ResourceNotFoundError("Membership", input.membershipId);

      const isAdmin = ctx.principal.roles.includes("admin") || ctx.principal.roles.includes("system");
      const isOrgMember = ctx.principal.orgId === existing.organizationId;
      if (!isAdmin && !isOrgMember) {
        throw new InsufficientPermissionsError("change membership role");
      }

      if (existing.role === "OWNER" && input.role !== "OWNER") {
        throw new PreconditionFailedError(
          "Cannot demote OWNER role; transfer ownership first.",
        );
      }

      const updated = await this.membershipRepo.update(input.membershipId, {
        role: input.role,
        updatedAt: this.now(),
      });
      if (!updated) throw new ResourceNotFoundError("Membership", input.membershipId);
      this.log(ctx, "info", "membership.roleChanged", {
        membershipId: input.membershipId,
        newRole: input.role,
      });
      return toMembershipOutput(updated);
    });
  }

  /** List memberships with optional filters. */
  async listMemberships(
    ctx: ServiceContext,
    input: ListMembershipsInput,
  ): Promise<Result<MembershipListOutput, AppError>> {
    return serviceCall(async () => {
      const isAdmin = ctx.principal.roles.includes("admin") || ctx.principal.roles.includes("system");
      const isSelfQuery = input.userId !== undefined && input.userId === ctx.principal.userId;
      const isOrgQuery =
        input.organizationId !== undefined &&
        ctx.principal.orgId === input.organizationId;

      if (!isAdmin && !isSelfQuery && !isOrgQuery) {
        throw new InsufficientPermissionsError("list memberships");
      }

      const limit = input.limit ?? 20;
      const result = await this.membershipRepo.list({
        organizationId: input.organizationId,
        userId: input.userId,
        role: input.role,
        limit,
        cursor: input.cursor,
      });
      this.log(ctx, "debug", "membership.listed", { total: result.total });
      return result;
    });
  }

  /** Remove a member from an organization (admin or org admin only). */
  async removeMembership(
    ctx: ServiceContext,
    membershipId: string,
  ): Promise<Result<void, AppError>> {
    return serviceCall(async () => {
      const existing = await this.membershipRepo.findById(membershipId);
      if (!existing) throw new ResourceNotFoundError("Membership", membershipId);

      const isAdmin = ctx.principal.roles.includes("admin") || ctx.principal.roles.includes("system");
      const isSelf = ctx.principal.userId === existing.userId;
      const isOrgMember = ctx.principal.orgId === existing.organizationId;

      if (!isAdmin && !isSelf && !isOrgMember) {
        throw new InsufficientPermissionsError("remove organization member");
      }
      if (existing.role === "OWNER") {
        throw new PreconditionFailedError(
          "Cannot remove the OWNER membership; transfer ownership first.",
        );
      }

      const deleted = await this.membershipRepo.delete(membershipId);
      if (!deleted) throw new ResourceNotFoundError("Membership", membershipId);
      this.log(ctx, "info", "membership.removed", {
        membershipId,
        orgId: existing.organizationId,
        userId: existing.userId,
      });
    });
  }
}
