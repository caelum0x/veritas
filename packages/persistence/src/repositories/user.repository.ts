// UserRepository interface: read/write access to persisted user accounts.

import type { Page, PageRequest, Result } from "@veritas/core";
import type { NotFoundError, ConflictError } from "@veritas/core";
import type { User, CreateUser, UpdateUser } from "@veritas/contracts";

/** Filter options for listing users. */
export interface UserFilters {
  /** Optionally restrict to users matching an email address. */
  readonly email?: string;
  /** Optionally restrict to users with a given status. */
  readonly status?: "ACTIVE" | "SUSPENDED" | "DELETED";
  /** Optionally restrict to users belonging to a specific organization. */
  readonly organizationId?: string;
}

/** Repository abstraction for User entities. */
export interface UserRepository {
  /**
   * Find a user by its id.
   * Returns Err(NotFoundError) if no such user exists.
   */
  findById(id: string): Promise<Result<User, NotFoundError>>;

  /**
   * Find a user by their email address.
   * Returns Err(NotFoundError) if no user has that email.
   */
  findByEmail(email: string): Promise<Result<User, NotFoundError>>;

  /**
   * List users with optional filters and cursor-based pagination.
   */
  list(filters: UserFilters, page: PageRequest): Promise<Page<User>>;

  /**
   * Persist a new user derived from CreateUser data.
   * Returns Err(ConflictError) if a user with the same email already exists.
   */
  create(data: CreateUser): Promise<Result<User, ConflictError>>;

  /**
   * Apply a partial update to an existing user by id.
   * Returns Err(NotFoundError) if the user does not exist.
   */
  update(id: string, data: UpdateUser): Promise<Result<User, NotFoundError>>;

  /**
   * Remove a user by id.
   * Returns Err(NotFoundError) if the user does not exist.
   */
  delete(id: string): Promise<Result<User, NotFoundError>>;
}
