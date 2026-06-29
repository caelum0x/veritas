// MembershipRepository interface: read/write access to persisted org memberships.

import type { Result } from "@veritas/core";
import type { NotFoundError, ConflictError } from "@veritas/core";
import type { Page, PageRequest } from "@veritas/core";
import type { Membership, CreateMembership, UpdateMembership, MembershipRole } from "@veritas/contracts";

/** Filter options for listing memberships. */
export interface MembershipFilters {
  /** Restrict to memberships for a specific organization. */
  readonly organizationId?: string;
  /** Restrict to memberships for a specific user. */
  readonly userId?: string;
  /** Restrict to memberships with a specific role. */
  readonly role?: MembershipRole;
}

/** Repository abstraction for Membership entities. */
export interface MembershipRepository {
  /**
   * Find a membership by its id.
   * Returns Err(NotFoundError) if no such membership exists.
   */
  findById(id: string): Promise<Result<Membership, NotFoundError>>;

  /**
   * Find a membership by organization and user ids.
   * Returns Err(NotFoundError) if no matching membership exists.
   */
  findByOrganizationAndUser(
    organizationId: string,
    userId: string,
  ): Promise<Result<Membership, NotFoundError>>;

  /**
   * List memberships with optional filters and cursor-based pagination.
   */
  list(filters: MembershipFilters, page: PageRequest): Promise<Page<Membership>>;

  /**
   * Persist a new membership.
   * Returns Err(ConflictError) if the user is already a member of the organization.
   */
  create(data: CreateMembership): Promise<Result<Membership, ConflictError>>;

  /**
   * Update mutable fields of an existing membership.
   * Returns Err(NotFoundError) if the membership does not exist.
   */
  update(id: string, data: UpdateMembership): Promise<Result<Membership, NotFoundError>>;

  /**
   * Remove a membership by id.
   * Returns Err(NotFoundError) if the membership does not exist.
   */
  delete(id: string): Promise<Result<Membership, NotFoundError>>;
}
