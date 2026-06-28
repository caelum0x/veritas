// SubscriptionRepository interface: read/write access to persisted subscription records.

import type { Result } from "@veritas/core";
import type { NotFoundError, ConflictError } from "@veritas/core";
import type { Page, PageRequest } from "@veritas/core";
import type {
  Subscription,
  CreateSubscription,
  UpdateSubscription,
  SubscriptionStatus,
} from "@veritas/contracts";

/** Filter options for listing subscriptions. */
export interface SubscriptionFilters {
  /** Restrict to subscriptions for a specific organization. */
  readonly organizationId?: string;
  /** Restrict to subscriptions for a specific plan. */
  readonly planId?: string;
  /** Restrict to subscriptions with a specific status. */
  readonly status?: SubscriptionStatus;
}

/** Repository abstraction for Subscription entities. */
export interface SubscriptionRepository {
  /**
   * Find a subscription by its id.
   * Returns Err(NotFoundError) if no such subscription exists.
   */
  findById(id: string): Promise<Result<Subscription, NotFoundError>>;

  /**
   * Find the active subscription for an organization.
   * Returns Err(NotFoundError) if the organization has no active subscription.
   */
  findActiveByOrganizationId(
    organizationId: string
  ): Promise<Result<Subscription, NotFoundError>>;

  /**
   * List subscriptions with optional filters and cursor-based pagination.
   */
  list(filters: SubscriptionFilters, page: PageRequest): Promise<Page<Subscription>>;

  /**
   * Persist a new subscription derived from CreateSubscription data.
   * Returns Err(ConflictError) if the organization already has an active subscription.
   */
  create(data: CreateSubscription): Promise<Result<Subscription, ConflictError>>;

  /**
   * Apply a partial update to an existing subscription.
   * Returns Err(NotFoundError) if the subscription does not exist.
   */
  update(id: string, data: UpdateSubscription): Promise<Result<Subscription, NotFoundError>>;

  /**
   * Remove a subscription by id.
   * Returns Err(NotFoundError) if the subscription does not exist.
   */
  delete(id: string): Promise<Result<void, NotFoundError>>;
}
