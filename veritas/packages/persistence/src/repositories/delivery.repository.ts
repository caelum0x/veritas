// DeliveryRepository interface: read/write access to persisted delivery records.

import type { Result } from "@veritas/core";
import type { NotFoundError, ConflictError } from "@veritas/core";
import type { Page, PageRequest } from "@veritas/core";
import type { Delivery, CreateDelivery, DeliveryStatus } from "@veritas/contracts";

/** Filter options for listing deliveries. */
export interface DeliveryFilters {
  /** Restrict to deliveries for a specific order. */
  readonly orderId?: string;
  /** Restrict to deliveries with a specific status. */
  readonly status?: DeliveryStatus;
}

/** Repository abstraction for Delivery entities. */
export interface DeliveryRepository {
  /**
   * Find a delivery by its id.
   * Returns Err(NotFoundError) if no such delivery exists.
   */
  findById(id: string): Promise<Result<Delivery, NotFoundError>>;

  /**
   * Find a delivery by its associated order id.
   * Returns Err(NotFoundError) if no delivery is linked to that order.
   */
  findByOrderId(orderId: string): Promise<Result<Delivery, NotFoundError>>;

  /**
   * List deliveries with optional filters and cursor-based pagination.
   */
  list(filters: DeliveryFilters, page: PageRequest): Promise<Page<Delivery>>;

  /**
   * Persist a new delivery derived from CreateDelivery data.
   * Returns Err(ConflictError) if a delivery for the same orderId already exists.
   */
  create(data: CreateDelivery): Promise<Result<Delivery, ConflictError>>;

  /**
   * Replace a stored delivery's mutable fields.
   * Returns Err(NotFoundError) if the delivery does not exist.
   */
  update(id: string, data: Partial<CreateDelivery> & { status?: DeliveryStatus; deliveredAt?: string | null; contentHash?: string | null }): Promise<Result<Delivery, NotFoundError>>;

  /**
   * Remove a delivery by id.
   * Returns Err(NotFoundError) if the delivery does not exist.
   */
  delete(id: string): Promise<Result<void, NotFoundError>>;
}
