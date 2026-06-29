// Agent discovery: port interface + in-memory registry for finding A2A agents.

import { z } from "zod";
import { type Result, ok, err } from "@veritas/core";
import { type A2AAgentCard, A2AAgentCardSchema } from "./agent-card.js";

/** Query parameters for capability-based agent discovery. */
export const DiscoveryQuerySchema = z.object({
  /** Filter by capability id (exact match). */
  capabilityId: z.string().min(1).optional(),
  /** Filter by keyword present in name or description. */
  keyword: z.string().optional(),
  /** Maximum number of results to return. */
  limit: z.number().int().min(1).max(100).default(20),
});
export type DiscoveryQuery = z.infer<typeof DiscoveryQuerySchema>;

/** Port interface for agent card discovery. */
export interface AgentDiscovery {
  /** Register or update an agent card in the registry. */
  register(card: A2AAgentCard): Promise<Result<void>>;
  /** Deregister an agent by id. */
  deregister(agentId: string): Promise<Result<void>>;
  /** Resolve a single card by agent id. */
  resolve(agentId: string): Promise<Result<A2AAgentCard>>;
  /** Search for agent cards matching the query. */
  search(query: DiscoveryQuery): Promise<Result<A2AAgentCard[]>>;
}

/** In-memory implementation of AgentDiscovery for testing and dev. */
export class InMemoryAgentDiscovery implements AgentDiscovery {
  private readonly cards = new Map<string, A2AAgentCard>();

  async register(card: A2AAgentCard): Promise<Result<void>> {
    const parsed = A2AAgentCardSchema.safeParse(card);
    if (!parsed.success) {
      return err(new Error(`Invalid agent card: ${parsed.error.message}`));
    }
    this.cards.set(card.agentId, parsed.data);
    return ok(undefined);
  }

  async deregister(agentId: string): Promise<Result<void>> {
    this.cards.delete(agentId);
    return ok(undefined);
  }

  async resolve(agentId: string): Promise<Result<A2AAgentCard>> {
    const card = this.cards.get(agentId);
    if (card === undefined) {
      return err(new Error(`Agent not found: ${agentId}`));
    }
    return ok(card);
  }

  async search(query: DiscoveryQuery): Promise<Result<A2AAgentCard[]>> {
    const parsed = DiscoveryQuerySchema.safeParse(query);
    if (!parsed.success) {
      return err(new Error(`Invalid discovery query: ${parsed.error.message}`));
    }
    const { capabilityId, keyword, limit } = parsed.data;
    let results = Array.from(this.cards.values());

    if (capabilityId !== undefined) {
      results = results.filter((c) =>
        c.capabilities.some((cap) => cap.id === capabilityId)
      );
    }

    if (keyword !== undefined) {
      const kw = keyword.toLowerCase();
      results = results.filter(
        (c) =>
          c.name.toLowerCase().includes(kw) ||
          c.description.toLowerCase().includes(kw)
      );
    }

    return ok(results.slice(0, limit));
  }

  /** Return the total number of registered cards (useful for testing). */
  size(): number {
    return this.cards.size;
  }
}
