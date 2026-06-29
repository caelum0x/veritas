// AgentRegistry: in-memory registry of known CAP agents available for claim routing.

import { ok, err, newId } from "@veritas/core";
import type { Result, AppError } from "@veritas/core";
import { NotFoundError, ConflictError } from "@veritas/core";

/** Capabilities a registered agent advertises. */
export type AgentCapability =
  | "general"
  | "scientific"
  | "financial"
  | "legal"
  | "medical"
  | "geopolitical"
  | "technical";

/** A single registered agent entry. */
export interface RegistryEntry {
  readonly agentId: string;
  readonly name: string;
  readonly endpoint: string;
  readonly apiKey: string;
  readonly capabilities: readonly AgentCapability[];
  /** 0–1 trust score based on historic accuracy; higher is better. */
  readonly trustScore: number;
  /** Cost in USDC micros per claim verification. */
  readonly costPerClaimUsdc: number;
  readonly registeredAt: string;
  readonly healthy: boolean;
}

/** Options for registering a new agent. */
export interface RegisterAgentOptions {
  readonly name: string;
  readonly endpoint: string;
  readonly apiKey: string;
  readonly capabilities: readonly AgentCapability[];
  readonly trustScore?: number;
  readonly costPerClaimUsdc?: number;
}

/** Filtering options for listing agents. */
export interface ListAgentsFilter {
  readonly capability?: AgentCapability;
  readonly healthyOnly?: boolean;
  readonly maxCostPerClaimUsdc?: number;
  readonly minTrustScore?: number;
}

/** Thread-safe (single-process) in-memory agent registry. */
export class AgentRegistry {
  private readonly entries: Map<string, RegistryEntry> = new Map();

  /** Register a new agent. Returns ConflictError if the endpoint is already registered. */
  register(options: RegisterAgentOptions): Result<RegistryEntry, AppError> {
    for (const entry of this.entries.values()) {
      if (entry.endpoint === options.endpoint) {
        return err(
          new ConflictError({
            message: `Agent with endpoint "${options.endpoint}" is already registered (id: ${entry.agentId})`,
          }) as AppError,
        );
      }
    }

    const agentId = newId("agent");
    const entry: RegistryEntry = {
      agentId,
      name: options.name,
      endpoint: options.endpoint,
      apiKey: options.apiKey,
      capabilities: options.capabilities,
      trustScore: options.trustScore ?? 0.5,
      costPerClaimUsdc: options.costPerClaimUsdc ?? 0,
      registeredAt: new Date().toISOString(),
      healthy: true,
    };

    this.entries.set(agentId, entry);
    return ok(entry);
  }

  /** Remove a registered agent. Returns NotFoundError if the agentId is unknown. */
  deregister(agentId: string): Result<void, AppError> {
    if (!this.entries.has(agentId)) {
      return err(
        new NotFoundError({ message: `Agent "${agentId}" not found in registry` }) as AppError,
      );
    }
    this.entries.delete(agentId);
    return ok(undefined);
  }

  /** Mark an agent healthy or unhealthy. */
  setHealth(agentId: string, healthy: boolean): Result<RegistryEntry, AppError> {
    const existing = this.entries.get(agentId);
    if (!existing) {
      return err(
        new NotFoundError({ message: `Agent "${agentId}" not found in registry` }) as AppError,
      );
    }
    const updated: RegistryEntry = { ...existing, healthy };
    this.entries.set(agentId, updated);
    return ok(updated);
  }

  /** Update an agent's trust score after a verification outcome. */
  updateTrustScore(agentId: string, newScore: number): Result<RegistryEntry, AppError> {
    const existing = this.entries.get(agentId);
    if (!existing) {
      return err(
        new NotFoundError({ message: `Agent "${agentId}" not found in registry` }) as AppError,
      );
    }
    const clamped = Math.max(0, Math.min(1, newScore));
    const updated: RegistryEntry = { ...existing, trustScore: clamped };
    this.entries.set(agentId, updated);
    return ok(updated);
  }

  /** Retrieve a single agent by ID. */
  get(agentId: string): Result<RegistryEntry, AppError> {
    const entry = this.entries.get(agentId);
    if (!entry) {
      return err(
        new NotFoundError({ message: `Agent "${agentId}" not found in registry` }) as AppError,
      );
    }
    return ok(entry);
  }

  /** List agents, optionally filtered. Results are returned sorted by trustScore descending. */
  list(filter: ListAgentsFilter = {}): readonly RegistryEntry[] {
    let results = [...this.entries.values()];

    if (filter.healthyOnly) {
      results = results.filter((e) => e.healthy);
    }
    if (filter.capability !== undefined) {
      results = results.filter((e) => e.capabilities.includes(filter.capability!));
    }
    if (filter.maxCostPerClaimUsdc !== undefined) {
      results = results.filter((e) => e.costPerClaimUsdc <= filter.maxCostPerClaimUsdc!);
    }
    if (filter.minTrustScore !== undefined) {
      results = results.filter((e) => e.trustScore >= filter.minTrustScore!);
    }

    return results.sort((a, b) => b.trustScore - a.trustScore);
  }

  /** Total number of registered agents (healthy or not). */
  get size(): number {
    return this.entries.size;
  }
}

/** Create a fresh AgentRegistry instance. */
export function createAgentRegistry(): AgentRegistry {
  return new AgentRegistry();
}
