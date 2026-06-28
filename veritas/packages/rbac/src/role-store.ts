// RoleStore interface and in-memory implementation for RBAC role management.

import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { Role } from "./role.js";
import { BUILT_IN_ROLES } from "./role.js";
import type { RoleId } from "./role.js";
import { RoleNotFoundError, RoleAlreadyExistsError } from "./errors.js";

/** Repository interface for role persistence. */
export interface RoleStore {
  findById(id: RoleId): Promise<Result<Role, RoleNotFoundError>>;
  findAll(): Promise<ReadonlyArray<Role>>;
  create(role: Role): Promise<Result<Role, RoleAlreadyExistsError>>;
  update(role: Role): Promise<Result<Role, RoleNotFoundError>>;
  delete(id: RoleId): Promise<Result<void, RoleNotFoundError>>;
  exists(id: RoleId): Promise<boolean>;
}

/** In-memory RoleStore seeded with built-in roles. */
export class InMemoryRoleStore implements RoleStore {
  private readonly roles: Map<RoleId, Role>;

  constructor(seed: ReadonlyArray<Role> = BUILT_IN_ROLES) {
    this.roles = new Map(seed.map((r) => [r.id, r]));
  }

  async findById(id: RoleId): Promise<Result<Role, RoleNotFoundError>> {
    const role = this.roles.get(id);
    if (role === undefined) {
      return err(new RoleNotFoundError(id));
    }
    return ok(role);
  }

  async findAll(): Promise<ReadonlyArray<Role>> {
    return Array.from(this.roles.values());
  }

  async create(role: Role): Promise<Result<Role, RoleAlreadyExistsError>> {
    if (this.roles.has(role.id)) {
      return err(new RoleAlreadyExistsError(role.id));
    }
    this.roles.set(role.id, role);
    return ok(role);
  }

  async update(role: Role): Promise<Result<Role, RoleNotFoundError>> {
    if (!this.roles.has(role.id)) {
      return err(new RoleNotFoundError(role.id));
    }
    this.roles.set(role.id, role);
    return ok(role);
  }

  async delete(id: RoleId): Promise<Result<void, RoleNotFoundError>> {
    if (!this.roles.has(id)) {
      return err(new RoleNotFoundError(id));
    }
    this.roles.delete(id);
    return ok(undefined);
  }

  async exists(id: RoleId): Promise<boolean> {
    return this.roles.has(id);
  }
}
