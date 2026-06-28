// Flow: discover a matching service listing and place a hire order via buyer-agent.

import {
  type Result,
  ok,
  err,
  type EventBus,
  type Logger,
  noopLogger,
} from "@veritas/core";
import type { DiscoveryPort, OrderPort } from "./deps.js";
import { DiscoverHireError } from "./errors.js";
import {
  makeServiceHiredEvent,
  type ServiceHiredPayload,
} from "./events.js";

export interface DiscoverAndHireInput {
  readonly buyerAgentId: string;
  readonly categoryId?: string;
  readonly maxPriceBaseUnits?: bigint;
  /** Minimum Provider Trust Score threshold for candidate listings. */
  readonly minPtsScore?: number;
  readonly maxResults?: number;
}

export interface DiscoverAndHireOutput {
  readonly orderId: string;
  readonly listingId: string;
  readonly sellerAgentId: string;
  readonly priceBaseUnits: bigint;
}

export interface DiscoverAndHireFlowDeps {
  readonly discovery: DiscoveryPort;
  readonly orders: OrderPort;
  readonly eventBus?: EventBus;
  readonly logger?: Logger;
}

/** Discover the best matching service listing and place a hire order. */
export async function discoverAndHireFlow(
  input: DiscoverAndHireInput,
  deps: DiscoverAndHireFlowDeps,
): Promise<Result<DiscoverAndHireOutput>> {
  const log = deps.logger ?? noopLogger;

  // Step 1: discover candidate listings
  const candidates = await deps.discovery.findListings({
    categoryId: input.categoryId,
    maxPriceBaseUnits: input.maxPriceBaseUnits,
    minPtsScore: input.minPtsScore,
    limit: input.maxResults ?? 10,
  });

  if (candidates.length === 0) {
    log.warn("discover-and-hire: no listings matched criteria", {
      buyerAgentId: input.buyerAgentId,
      categoryId: input.categoryId,
    });
    return err(new DiscoverHireError("No listings matched the given criteria"));
  }

  // Step 2: select best candidate (highest PTS score, then lowest price)
  const sorted = [...candidates].sort((a, b) => {
    const ptsDiff = b.ptsScore - a.ptsScore;
    if (Math.abs(ptsDiff) > 0.01) return ptsDiff;
    return Number(a.priceBaseUnits - b.priceBaseUnits);
  });
  const best = sorted[0]!;
  log.info("discover-and-hire: selected listing", {
    listingId: best.listingId,
    sellerAgentId: best.agentId,
    pts: best.ptsScore,
  });

  // Step 3: create hire order
  const orderResult = await deps.orders.createOrder({
    listingId: best.listingId,
    buyerAgentId: input.buyerAgentId,
    sellerAgentId: best.agentId,
    priceBaseUnits: best.priceBaseUnits,
  });
  if (!orderResult.ok) {
    log.error("discover-and-hire: order creation failed", { listingId: best.listingId });
    const orderErr = orderResult.error;
    const orderMsg = orderErr instanceof Error ? orderErr.message : String(orderErr);
    return err(
      new DiscoverHireError(
        `Failed to create order for listing ${best.listingId}: ${orderMsg}`,
        { cause: orderErr },
      ),
    );
  }
  const { orderId } = orderResult.value;
  log.info("discover-and-hire: order created", { orderId, listingId: best.listingId });

  // Step 4: emit domain event
  if (deps.eventBus) {
    const payload: ServiceHiredPayload = {
      listingId: best.listingId,
      buyerAgentId: input.buyerAgentId,
      sellerAgentId: best.agentId,
      orderId,
    };
    deps.eventBus.publish(makeServiceHiredEvent(payload));
  }

  return ok({
    orderId,
    listingId: best.listingId,
    sellerAgentId: best.agentId,
    priceBaseUnits: best.priceBaseUnits,
  });
}
