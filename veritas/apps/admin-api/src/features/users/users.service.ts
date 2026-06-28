// Users feature service — delegates user CRUD and lifecycle ops to UserService.
import type { Deps } from "../../container.js";
import type { ServiceContext, UserOutput } from "@veritas/services";
import type { AppError, Result } from "@veritas/services";
import type {
  CreateUserBody,
  UpdateUserBody,
  ListUsersQuery,
  SetUserStatusBody,
  VerifyEmailBody,
} from "./users.schema.js";

export type { UserOutput };

export interface UserListResult {
  readonly items: UserOutput[];
  readonly nextCursor: string | null;
  readonly total: number;
}

/** Admin-API users service: wraps @veritas/services UserService. */
export class UsersService {
  private readonly userService: Deps["userService"];
  private readonly auditLogService: Deps["auditLogService"];

  constructor(deps: Pick<Deps, "userService" | "auditLogService">) {
    this.userService = deps.userService;
    this.auditLogService = deps.auditLogService;
  }

  async create(
    ctx: ServiceContext,
    body: CreateUserBody,
  ): Promise<Result<UserOutput, AppError>> {
    const result = await this.userService.createUser(ctx, {
      email: body.email,
      name: body.name ?? null,
      avatarUrl: body.avatarUrl ?? null,
      metadata: body.metadata,
    });
    if (result.ok) {
      await this.auditLogService.append(ctx, {
        action: "user.created",
        actorId: ctx.principal.userId,
        actorType: "user",
        resourceType: "user",
        resourceId: result.value.id,
        orgId: ctx.principal.orgId ?? "system",
      } as never);
    }
    return result;
  }

  async getById(
    ctx: ServiceContext,
    userId: string,
  ): Promise<Result<UserOutput, AppError>> {
    return this.userService.getUser(ctx, userId);
  }

  async update(
    ctx: ServiceContext,
    userId: string,
    body: UpdateUserBody,
  ): Promise<Result<UserOutput, AppError>> {
    const result = await this.userService.updateUser(ctx, userId, {
      name: body.name,
      avatarUrl: body.avatarUrl,
      emailVerified: body.emailVerified,
      status: body.status,
      metadata: body.metadata,
    });
    if (result.ok) {
      await this.auditLogService.append(ctx, {
        action: "user.updated",
        actorId: ctx.principal.userId,
        actorType: "user",
        resourceType: "user",
        resourceId: userId,
        orgId: ctx.principal.orgId ?? "system",
      } as never);
    }
    return result;
  }

  async list(
    ctx: ServiceContext,
    query: ListUsersQuery,
  ): Promise<Result<UserListResult, AppError>> {
    return this.userService.listUsers(ctx, {
      email: query.email,
      status: query.status,
      limit: query.limit,
      cursor: query.cursor,
    });
  }

  async setStatus(
    ctx: ServiceContext,
    userId: string,
    body: SetUserStatusBody,
  ): Promise<Result<UserOutput, AppError>> {
    const result = await this.userService.setUserStatus(ctx, {
      userId,
      status: body.status,
      reason: body.reason,
    });
    if (result.ok) {
      await this.auditLogService.append(ctx, {
        action: "user.statusChanged",
        actorId: ctx.principal.userId,
        actorType: "user",
        resourceType: "user",
        resourceId: userId,
        orgId: ctx.principal.orgId ?? "system",
        metadata: { status: body.status, reason: body.reason },
      } as never);
    }
    return result;
  }

  async verifyEmail(
    ctx: ServiceContext,
    userId: string,
    body: VerifyEmailBody,
  ): Promise<Result<UserOutput, AppError>> {
    const result = await this.userService.verifyEmail(ctx, {
      userId,
      token: body.token,
    });
    if (result.ok) {
      await this.auditLogService.append(ctx, {
        action: "user.emailVerified",
        actorId: ctx.principal.userId,
        actorType: "user",
        resourceType: "user",
        resourceId: userId,
        orgId: ctx.principal.orgId ?? "system",
      } as never);
    }
    return result;
  }

  async recordLogin(
    ctx: ServiceContext,
    userId: string,
  ): Promise<Result<UserOutput, AppError>> {
    return this.userService.recordLogin(ctx, userId);
  }
}
