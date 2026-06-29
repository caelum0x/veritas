// OrganizationRepository interface: read/write access to persisted organizations.

import type { Page, PageRequest, Result } from "@veritas/core";
import type { NotFoundError, ConflictError } from "@veritas/core";
import type { Organization, CreateOrganization, UpdateOrganization } from "@veritas/contracts";

/** Filter options for listing organizations. */
export interface OrganizationFilters {
  /** Optionally restrict to organizations owned by a specific user. */
  readonly ownerId?: string;
  /** Optionally restrict to an organization with a specific slug. */
  readonly slug?: string;
}

/** Repository abstraction for Organization entities. */
export interface OrganizationRepository {
  /**
   * Find an organization by its id.
   * Returns Err(NotFoundError) if no such organization exists.
   */
  findById(id: string): Promise<Result<Organization, NotFoundError>>;

  /**
   * Find an organization by its unique slug.
   * Returns Err(NotFoundError) if no organization has that slug.
   */
  findBySlug(slug: string): Promise<Result<Organization, NotFoundError>>;

  /**
   * List organizations with optional filters and cursor-based pagination.
   */
  list(filters: OrganizationFilters, page: PageRequest): Promise<Page<Organization>>;

  /**
   * Persist a new organization derived from CreateOrganization data.
   * Returns Err(ConflictError) if an organization with the same slug already exists.
   */
  create(data: CreateOrganization): Promise<Result<Organization, ConflictError>>;

  /**
   * Apply a partial update to an existing organization by id.
   * Returns Err(NotFoundError) if the organization does not exist.
   */
  update(id: string, data: UpdateOrganization): Promise<Result<Organization, NotFoundError>>;

  /**
   * Remove an organization by id.
   * Returns Err(NotFoundError) if the organization does not exist.
   */
  delete(id: string): Promise<Result<Organization, NotFoundError>>;
}
