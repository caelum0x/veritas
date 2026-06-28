// Replica router — selects the best node for a given read or write operation.
import { ok, err, type Result } from "@veritas/core";
import type { ReplicaNode, ConsistencyLevel, RouteDecision } from "./types.js";
import { NoHealthyReplicaError, ReplicaLagExceededError } from "./errors.js";

export interface RouterOptions {
  maxAcceptableLagMs: number;
}

/** Pick the primary node for writes. */
export function routeWrite(
  nodes: readonly ReplicaNode[]
): Result<RouteDecision> {
  const primary = nodes.find((n) => n.role === "primary" && n.status === "healthy");
  if (!primary) {
    return err(new NoHealthyReplicaError({ message: "No healthy primary node available for write" }));
  }
  return ok({ node: primary, reason: "primary selected for write" });
}

/** Pick a node for reads based on consistency level and weighted random selection. */
export function routeRead(
  nodes: readonly ReplicaNode[],
  consistency: ConsistencyLevel,
  opts: RouterOptions
): Result<RouteDecision> {
  if (consistency === "strong") {
    return routeWrite(nodes);
  }

  const candidates = nodes.filter((n) => n.status === "healthy");
  if (candidates.length === 0) {
    return err(new NoHealthyReplicaError());
  }

  if (consistency === "bounded_staleness") {
    const fresh = candidates.filter((n) => n.lagMs <= opts.maxAcceptableLagMs);
    if (fresh.length === 0) {
      const worst = candidates.reduce((a, b) => (a.lagMs < b.lagMs ? a : b));
      return err(new ReplicaLagExceededError(worst.id, worst.lagMs, opts.maxAcceptableLagMs));
    }
    const node = weightedRandom(fresh);
    return ok({ node, reason: `bounded_staleness: lag ${node.lagMs}ms <= ${opts.maxAcceptableLagMs}ms` });
  }

  // eventual: prefer replicas, fall back to primary
  const replicas = candidates.filter((n) => n.role === "replica");
  const pool = replicas.length > 0 ? replicas : candidates;
  const node = weightedRandom(pool);
  return ok({ node, reason: `eventual: selected from ${pool.length} healthy node(s)` });
}

function weightedRandom(nodes: readonly ReplicaNode[]): ReplicaNode {
  const totalWeight = nodes.reduce((sum, n) => sum + n.weight, 0);
  let cursor = Math.random() * totalWeight;
  for (const node of nodes) {
    cursor -= node.weight;
    if (cursor <= 0) return node;
  }
  return nodes[nodes.length - 1]!;
}

/** Stateful router that holds node list and opts. */
export interface ReplicaRouter {
  routeRead(consistency: ConsistencyLevel): Result<RouteDecision>;
  routeWrite(): Result<RouteDecision>;
}

/** Create a ReplicaRouter from a node list and options. */
export function createRouter(nodes: readonly ReplicaNode[], opts: RouterOptions): ReplicaRouter {
  return {
    routeRead(consistency) {
      return routeRead(nodes, consistency, opts);
    },
    routeWrite() {
      return routeWrite(nodes);
    },
  };
}
