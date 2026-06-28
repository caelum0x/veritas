// PlanRepository interface: read/write access to persisted billing plan records.

import type { Result } from "@veritas/core";
import type { NotFoundError, ConflictError } from "@veritas/core";
import type { Page, PageRequest } from "@veritas/core";
import type { Plan, CreatePlan, UpdatePlan, BillingInterval } from "@veritas/contracts";

/** Filter options for listing plans. */
export interface PlanFilters {
  /** Restrict to plans with a specific billing interval. */
  readonly billingInterval?: BillingInterval;
  /** Restrict to active or inactive plans. */
  readonly isActive?: boolean;
  /** Restrict to plans with a specific currency. */
  readonly priceCurrency?: string;
}

/** Repository abstraction for Plan entities. */
export interface PlanRepository {
  /**
   * Find a plan by its id.
   * Returns Err(NotFoundError) if no such plan exists.
   */
  findById(id: string): Promise<Result<Plan, NotFoundError>>;

  /**
   * Find a plan by its exact name.
   * Returns Err(NotFoundError) if no plan has that name.
   */
  findByName(name: string): Promise<Result<Plan, NotFoundError>>;

  /**
   * List plans with optional filters and cursor-based pagination.
   */
  list(filters: PlanFilters, page: PageRequest): Promise<Page<Plan>>;

  /**
   * Persist a new plan derived from CreatePlan data.
   * Returns Err(ConflictError) if a plan with the same name already exists.
   */
  create(data: CreatePlan): Promise<Result<Plan, ConflictError>>;

  /**
   * Apply a partial update to an existing plan.
   * Returns Err(NotFoundError) if the plan does not exist.
   */
  update(id: string, data: UpdatePlan): Promise<Result<Plan, NotFoundError>>;

  /**
   * Remove a plan by id.
   * Returns Err(NotFoundError) if the plan does not exist.
   */
  delete(id: string): Promise<Result<void, NotFoundError>>;
}
