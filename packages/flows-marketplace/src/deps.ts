// Port interfaces (dependency contracts) injected into @veritas/flows-marketplace flows.

import type { Result } from "@veritas/core";
import type { AgentIdentity, IdentityRegistryPort, RegisterIdentityOptions } from "@veritas/identity";
import type { ListingStore } from "@veritas/marketplace";
import type { AgentRegistryPort, ServiceRegistryPort, RegisterAgentParams, RegisterServiceParams, RegistryTxResult } from "@veritas/registry-onchain";
import type { PtsScore } from "@veritas/reputation";

// ── Identity port (re-export for consumer convenience) ────────────────────────

export type { IdentityRegistryPort, RegisterIdentityOptions };

// ── Marketplace listing store port ────────────────────────────────────────────

export type { ListingStore };

// ── On-chain registry ports ───────────────────────────────────────────────────

export type { AgentRegistryPort, ServiceRegistryPort, RegisterAgentParams, RegisterServiceParams, RegistryTxResult };

// ── Reputation port ───────────────────────────────────────────────────────────

/** Port for reading and writing agent PTS scores. */
export interface ReputationPort {
  getScore(agentId: string): Promise<Result<PtsScore>>;
  setScore(agentId: string, score: PtsScore, reason: string): Promise<Result<PtsScore>>;
  initScore(agentId: string): Promise<Result<PtsScore>>;
}

// ── Service discovery port ────────────────────────────────────────────────────

/** Minimal representation of a discovered service listing. */
export interface DiscoveredListing {
  readonly listingId: string;
  readonly agentId: string;
  readonly serviceId: string;
  readonly title: string;
  readonly priceBaseUnits: bigint;
  readonly ptsScore: PtsScore;
}

/** Port for discovering marketplace listings by criteria. */
export interface DiscoveryPort {
  findListings(query: {
    categoryId?: string;
    maxPriceBaseUnits?: bigint;
    minPtsScore?: number;
    limit?: number;
  }): Promise<ReadonlyArray<DiscoveredListing>>;
}

// ── Order / hire port ─────────────────────────────────────────────────────────

/** Outcome of a completed order, used to update reputation. */
export type OrderOutcome = "success" | "partial" | "failure" | "dispute_resolved";

/** Port for creating and managing marketplace orders. */
export interface OrderPort {
  createOrder(params: {
    listingId: string;
    buyerAgentId: string;
    sellerAgentId: string;
    priceBaseUnits: bigint;
  }): Promise<Result<{ orderId: string }>>;
}

// ── Composite deps bundle ─────────────────────────────────────────────────────

/** All injectable dependencies consumed by flows-marketplace flows. */
export interface MarketplaceFlowDeps {
  readonly identityRegistry: IdentityRegistryPort;
  readonly agentRegistry: AgentRegistryPort;
  readonly serviceRegistry: ServiceRegistryPort;
  readonly listingStore: ListingStore;
  readonly reputation: ReputationPort;
  readonly discovery: DiscoveryPort;
  readonly orders: OrderPort;
}
