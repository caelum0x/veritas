// In-memory cache of pending CAP orders with optional API fallback for recovery.

import type { OrderId } from "@veritas/core";
import { Logger } from "@veritas/core";
import type { PendingOrder } from "./types.js";

/** Interface for an external API that can retrieve a pending order by ID. */
export interface OrderApiFallback {
  fetchOrder(orderId: OrderId): Promise<PendingOrder | null>;
}

/** A no-op fallback used when no API client is provided. */
const NULL_FALLBACK: OrderApiFallback = {
  fetchOrder: async (_orderId: OrderId) => null,
};

/**
 * Thread-safe (single-threaded Node) cache of in-flight CAP orders.
 * On cache miss the store optionally queries an external API to recover
 * order state after a provider restart or reconnect.
 */
export interface PendingStore {
  /** Add or replace a pending order in the cache. */
  put(order: PendingOrder): void;
  /**
   * Retrieve an order by ID.  On cache miss, attempts the API fallback.
   * Returns null when the order is not found in either source.
   */
  get(orderId: OrderId): Promise<PendingOrder | null>;
  /** Remove an order from the cache (call on completion, rejection, or expiry). */
  remove(orderId: OrderId): void;
  /** Snapshot of all currently cached orders. */
  all(): ReadonlyArray<PendingOrder>;
  /** Number of orders currently held in the cache. */
  size(): number;
}

/** Creates a PendingStore backed by a Map with an optional API fallback. */
export function makePendingStore(
  logger: Logger,
  fallback: OrderApiFallback = NULL_FALLBACK,
): PendingStore {
  const cache = new Map<OrderId, PendingOrder>();

  return {
    put(order: PendingOrder): void {
      cache.set(order.orderId, order);
      logger.debug("[cap:pending-store] order cached", {
        orderId: order.orderId,
        size: cache.size,
      });
    },

    async get(orderId: OrderId): Promise<PendingOrder | null> {
      const cached = cache.get(orderId);
      if (cached !== undefined) return cached;

      logger.debug("[cap:pending-store] cache miss, trying API fallback", { orderId });
      const fetched = await fallback.fetchOrder(orderId);
      if (fetched !== null) {
        cache.set(orderId, fetched);
        logger.info("[cap:pending-store] order recovered via API fallback", { orderId });
      }
      return fetched;
    },

    remove(orderId: OrderId): void {
      const existed = cache.delete(orderId);
      if (existed) {
        logger.debug("[cap:pending-store] order removed", { orderId, size: cache.size });
      }
    },

    all(): ReadonlyArray<PendingOrder> {
      return Array.from(cache.values());
    },

    size(): number {
      return cache.size;
    },
  };
}
