// Read consistency level definitions and satisfaction checks.
import { ok, err, type Result } from "@veritas/core";
import type { ReplicaNode, ConsistencyLevel, ReadConsistency } from "./types.js";
import { ConsistencyError } from "./errors.js";

/** Human-readable names for each read consistency level. */
export const ReadConsistencyLevel: Record<ConsistencyLevel, string> = {
  eventual: "Eventual Consistency — reads may be stale; highest availability",
  bounded_staleness: "Bounded Staleness — reads lag at most maxLagMs behind primary",
  strong: "Strong Consistency — reads always served from primary",
};

/** Human-readable names for write consistency options. */
export const WriteConsistencyLevel = {
  "primary-only": "Primary Only — write acknowledged by primary alone",
  majority: "Majority — write acknowledged by quorum of nodes",
  all: "All — write acknowledged by every node",
} as const;

/**
 * Check whether the given list of healthy nodes can satisfy the requested
 * consistency level, returning the candidate nodes or an error.
 */
export function satisfiesConsistency(
  nodes: readonly ReplicaNode[],
  consistency: ReadConsistency,
  maxLagMs: number
): Result<readonly ReplicaNode[]> {
  const healthy = nodes.filter((n) => n.status === "healthy");

  if (healthy.length === 0) {
    return err(new ConsistencyError(consistency, "no healthy nodes"));
  }

  if (consistency === "strong") {
    const primaries = healthy.filter((n) => n.role === "primary");
    if (primaries.length === 0) {
      return err(new ConsistencyError(consistency, "no healthy primary"));
    }
    return ok(primaries);
  }

  if (consistency === "bounded_staleness") {
    const fresh = healthy.filter((n) => n.lagMs <= maxLagMs);
    if (fresh.length === 0) {
      const minLag = Math.min(...healthy.map((n) => n.lagMs));
      return err(
        new ConsistencyError(
          consistency,
          `minimum lag ${minLag}ms exceeds max ${maxLagMs}ms`
        )
      );
    }
    return ok(fresh);
  }

  // eventual: all healthy nodes are acceptable
  return ok(healthy);
}
