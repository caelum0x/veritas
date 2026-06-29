// User application service: create, retrieve, update, list, and manage user accounts.
import {
  Result,
  ok,
  err,
  AppError,
  newId,
  epochToIso,
} from "@veritas/core";
import type { ServiceContext } from "../service-context.js";
import { BaseService, type BaseServiceDeps } from "../base-service.js";
import { serviceCall } from "../result.js";
import {
  ResourceNotFoundError,
  DuplicateResourceError,
  ServiceValidationError,
  InsufficientPermissionsError,
} from "../errors.js";
import type {
  CreateUserInput,
  UpdateUserInput,
  ListUsersInput,
  SetUserStatusInput,
  VerifyEmailInput,
  UserOutput,
  UserListOutput,
} from "./user.dto.js";
import { toUserOutput } from "./user.dto.js";

/** Minimal repository interface expected by UserService. */
export interface UserRepository {
  findById(id: string): Promise<UserOutput | null>;
  findByEmail(email: string): Promise<UserOutput | null>;
  list(opts: {
    email?: string;
    status?: "ACTIVE" | "SUSPENDED" | "DELETED";
    limit: number;
    cursor?: string;
  }): Promise<{ items: UserOutput[]; nextCursor: string | null; total: number }>;
  create(user: UserOutput): Promise<UserOutput>;
  update(id: string, patch: Partial<UserOutput>): Promise<UserOutput | null>;
}

export interface UserServiceDeps extends BaseServiceDeps {
  readonly userRepo: UserRepository;
}

/** Application service for managing platform users. */
export class UserService extends BaseService {
  private readonly userRepo: UserRepository;

  constructor(deps: UserServiceDeps) {
    super(deps);
    this.userRepo = deps.userRepo;
  }

  /** Create a new user account; email must be unique. */
  async createUser(
    ctx: ServiceContext,
    input: CreateUserInput,
  ): Promise<Result<UserOutput, AppError>> {
    return serviceCall(async () => {
      const existing = await this.userRepo.findByEmail(input.email);
      if (existing) {
        throw new DuplicateResourceError("User", "email", input.email);
      }
      const now = this.now();
      const user: UserOutput = {
        id: newId("user"),
        email: input.email,
        emailVerified: false,
        name: input.name ?? null,
        avatarUrl: input.avatarUrl ?? null,
        status: "ACTIVE",
        lastLoginAt: null,
        metadata: input.metadata,
        createdAt: now,
        updatedAt: now,
      };
      const created = await this.userRepo.create(user);
      this.log(ctx, "info", "user.created", { userId: created.id });
      return toUserOutput(created);
    });
  }

  /** Retrieve a single user by ID. */
  async getUser(
    ctx: ServiceContext,
    userId: string,
  ): Promise<Result<UserOutput, AppError>> {
    return serviceCall(async () => {
      const user = await this.userRepo.findById(userId);
      if (!user) throw new ResourceNotFoundError("User", userId);
      this.log(ctx, "debug", "user.fetched", { userId });
      return toUserOutput(user);
    });
  }

  /** Update mutable profile fields on an existing user. */
  async updateUser(
    ctx: ServiceContext,
    userId: string,
    input: UpdateUserInput,
  ): Promise<Result<UserOutput, AppError>> {
    return serviceCall(async () => {
      const existing = await this.userRepo.findById(userId);
      if (!existing) throw new ResourceNotFoundError("User", userId);

      const isSelf = ctx.principal.userId === userId;
      const isAdmin = ctx.principal.roles.includes("admin") || ctx.principal.roles.includes("system");
      if (!isSelf && !isAdmin) {
        throw new InsufficientPermissionsError("update user");
      }

      const patch: Partial<UserOutput> = { ...input, updatedAt: this.now() };
      const updated = await this.userRepo.update(userId, patch);
      if (!updated) throw new ResourceNotFoundError("User", userId);
      this.log(ctx, "info", "user.updated", { userId });
      return toUserOutput(updated);
    });
  }

  /** List users with optional filters. */
  async listUsers(
    ctx: ServiceContext,
    input: ListUsersInput,
  ): Promise<Result<UserListOutput, AppError>> {
    return serviceCall(async () => {
      const isAdmin = ctx.principal.roles.includes("admin") || ctx.principal.roles.includes("system");
      if (!isAdmin) {
        throw new InsufficientPermissionsError("list users");
      }
      const limit = input.limit ?? 20;
      const result = await this.userRepo.list({
        email: input.email,
        status: input.status,
        limit,
        cursor: input.cursor,
      });
      this.log(ctx, "debug", "user.listed", { total: result.total });
      return result;
    });
  }

  /** Change a user's account status (active, suspended, deleted). */
  async setUserStatus(
    ctx: ServiceContext,
    input: SetUserStatusInput,
  ): Promise<Result<UserOutput, AppError>> {
    return serviceCall(async () => {
      const isAdmin = ctx.principal.roles.includes("admin") || ctx.principal.roles.includes("system");
      if (!isAdmin) {
        throw new InsufficientPermissionsError("set user status");
      }
      const existing = await this.userRepo.findById(input.userId);
      if (!existing) throw new ResourceNotFoundError("User", input.userId);

      const patch: Partial<UserOutput> = {
        status: input.status,
        updatedAt: this.now(),
      };
      const updated = await this.userRepo.update(input.userId, patch);
      if (!updated) throw new ResourceNotFoundError("User", input.userId);
      this.log(ctx, "info", "user.statusChanged", {
        userId: input.userId,
        status: input.status,
      });
      return toUserOutput(updated);
    });
  }

  /** Mark a user's email as verified after token validation. */
  async verifyEmail(
    ctx: ServiceContext,
    input: VerifyEmailInput,
  ): Promise<Result<UserOutput, AppError>> {
    return serviceCall(async () => {
      const existing = await this.userRepo.findById(input.userId);
      if (!existing) throw new ResourceNotFoundError("User", input.userId);
      if (existing.emailVerified) {
        throw new ServiceValidationError("Email is already verified.");
      }
      // Token validation is handled upstream; service records the outcome.
      const patch: Partial<UserOutput> = {
        emailVerified: true,
        updatedAt: this.now(),
      };
      const updated = await this.userRepo.update(input.userId, patch);
      if (!updated) throw new ResourceNotFoundError("User", input.userId);
      this.log(ctx, "info", "user.emailVerified", { userId: input.userId });
      return toUserOutput(updated);
    });
  }

  /** Record the last-login timestamp for a user. */
  async recordLogin(
    ctx: ServiceContext,
    userId: string,
  ): Promise<Result<UserOutput, AppError>> {
    return serviceCall(async () => {
      const now = this.now();
      const updated = await this.userRepo.update(userId, {
        lastLoginAt: now,
        updatedAt: now,
      });
      if (!updated) throw new ResourceNotFoundError("User", userId);
      this.log(ctx, "info", "user.login", { userId });
      return toUserOutput(updated);
    });
  }
}
