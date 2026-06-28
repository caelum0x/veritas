// OrderRepository interface for paid USDC orders driving verification jobs.
import type { Result } from "@veritas/core";
import type { Order, CreateOrder, UpdateOrder } from "@veritas/contracts";
import type { BaseRepository } from "../base-repository.js";
import type { QueryOptions } from "../query.js";
import type { Page } from "@veritas/core";

/** Repository interface for Order entities. */
export interface OrderRepository extends BaseRepository<Order, CreateOrder, UpdateOrder> {
  /** Find all orders placed by a given buyer agent. */
  findByBuyerAgentId(buyerAgentId: string, options?: QueryOptions<Order>): Promise<Result<Page<Order>>>;

  /** Find all orders for a given service. */
  findByServiceId(serviceId: string, options?: QueryOptions<Order>): Promise<Result<Page<Order>>>;

  /** Find all orders linked to a specific negotiation. */
  findByNegotiationId(negotiationId: string, options?: QueryOptions<Order>): Promise<Result<Page<Order>>>;

  /** Find the order linked to a specific job, if any. */
  findByJobId(jobId: string): Promise<Result<Order>>;

  /** Find orders by status. */
  findByStatus(status: string, options?: QueryOptions<Order>): Promise<Result<Page<Order>>>;
}
