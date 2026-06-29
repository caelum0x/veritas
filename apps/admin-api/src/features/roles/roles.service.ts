// Application service for admin role management — delegates to @veritas/rbac.
import type { Deps } from "../../container.js";
import {
  roleId,
  unroleId,
  BUILT_IN_ROLES,
  RoleAlreadyExistsError,
  RoleNotFoundError,
  resolveInheritedRoles,
  getDirectPermissions,
  BUILT_IN_ROLE_MAP,
  parsePermission,
  permission,
} from "@veritas/rbac";
import type { Role, RoleId, RoleStore } from "@veritas/rbac";
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { CreateRoleBody, UpdateRoleBody } from "./roles.schema.js";
import { toRoleResponse, type RoleResponse } from "./roles.mapper.js";

export interface ListRolesOptions {
  readonly limit?: number;
  readonly cursor?: string;
  readonly search?: string;
}

export interface RolesPage {
  readonly items: readonly RoleResponse[];
  readonly nextCursor: string | null;
  readonly total: number;
}

/** Admin service for role CRUD and permission assignment via InMemoryRoleStore. */
export class RolesService {
  private readonly store: RoleStore;
  private readonly logger: Deps["logger"];

  constructor(deps: Pick<Deps, "roleStore" | "logger">) {
    this.store = deps.roleStore;
    this.logger = deps.logger;
  }

  /** List all roles with optional search filter and cursor pagination. */
  async list(opts: ListRolesOptions): Promise<Result<RolesPage, RoleNotFoundError>> {
    const all = await this.store.findAll();
    const filtered = opts.search
      ? all.filter(
          (r) =>
            r.name.toLowerCase().includes(opts.search!.toLowerCase()) ||
            unroleId(r.id).toLowerCase().includes(opts.search!.toLowerCase()),
        )
      : all;

    const limit = opts.limit ?? 20;
    const startIndex = opts.cursor
      ? filtered.findIndex((r) => unroleId(r.id) === opts.cursor) + 1
      : 0;
    const page = filtered.slice(startIndex, startIndex + limit);
    const nextCursor =
      startIndex + limit < filtered.length ? unroleId(page[page.length - 1]!.id) : null;

    return ok({
      items: page.map(toRoleResponse),
      nextCursor,
      total: filtered.length,
    });
  }

  /** Get a single role by its string id. */
  async getById(id: string): Promise<Result<RoleResponse, RoleNotFoundError>> {
    const rid = roleId(id);
    const result = await this.store.findById(rid);
    if (!result.ok) return err(result.error);
    return ok(toRoleResponse(result.value));
  }

  /** Create a custom role. Built-in role ids are rejected as conflicts. */
  async create(body: CreateRoleBody): Promise<Result<RoleResponse, RoleAlreadyExistsError>> {
    const rid = roleId(body.id);
    const inherits = body.inherits.map((i) => roleId(i) as RoleId);
    const role: Role = Object.freeze({
      id: rid,
      name: body.name,
      description: body.description,
      inherits,
    });
    const result = await this.store.create(role);
    if (!result.ok) return err(result.error);
    this.logger.info("role.created", { roleId: body.id });
    return ok(toRoleResponse(result.value));
  }

  /** Partially update an existing role's mutable fields. */
  async update(
    id: string,
    body: UpdateRoleBody,
  ): Promise<Result<RoleResponse, RoleNotFoundError>> {
    const rid = roleId(id);
    const existing = await this.store.findById(rid);
    if (!existing.ok) return err(existing.error);

    const updated: Role = Object.freeze({
      ...existing.value,
      name: body.name ?? existing.value.name,
      description: body.description ?? existing.value.description,
      inherits:
        body.inherits !== undefined
          ? body.inherits.map((i) => roleId(i) as RoleId)
          : existing.value.inherits,
    });

    const result = await this.store.update(updated);
    if (!result.ok) return err(result.error);
    this.logger.info("role.updated", { roleId: id });
    return ok(toRoleResponse(result.value));
  }

  /** Delete a role by id. Built-in roles can be deleted via admin only. */
  async delete(id: string): Promise<Result<void, RoleNotFoundError>> {
    const rid = roleId(id);
    const result = await this.store.delete(rid);
    if (!result.ok) return err(result.error);
    this.logger.info("role.deleted", { roleId: id });
    return ok(undefined);
  }

  /** Return the direct permissions for a role. */
  async getPermissions(
    id: string,
  ): Promise<Result<readonly string[], RoleNotFoundError>> {
    const rid = roleId(id);
    const exists = await this.store.exists(rid);
    if (!exists) return err(new RoleNotFoundError(id));
    const perms = getDirectPermissions(rid).map(String);
    return ok(perms);
  }

  /** Return the transitively inherited roles for a given role. */
  async getEffectiveRoles(
    id: string,
  ): Promise<Result<readonly string[], RoleNotFoundError>> {
    const rid = roleId(id);
    const exists = await this.store.exists(rid);
    if (!exists) return err(new RoleNotFoundError(id));
    const effective = Array.from(resolveInheritedRoles(rid, BUILT_IN_ROLE_MAP)).map(unroleId);
    return ok(effective);
  }
}
