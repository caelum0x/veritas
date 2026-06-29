// Replica health checker — polls nodes and records health status.
import { epochToIso } from "@veritas/core";
import type { ReplicaNode, ReplicaHealth, ReplicaStatus } from "./types.js";

export interface HealthChecker {
  check(node: ReplicaNode): Promise<ReplicaHealth>;
}

/** In-memory health checker that uses injected lag/status overrides. */
export class InMemoryHealthChecker implements HealthChecker {
  private readonly overrides = new Map<string, { status: ReplicaStatus; lagMs: number }>();

  setOverride(nodeId: string, status: ReplicaStatus, lagMs = 0): void {
    this.overrides.set(nodeId, { status, lagMs });
  }

  clearOverride(nodeId: string): void {
    this.overrides.delete(nodeId);
  }

  async check(node: ReplicaNode): Promise<ReplicaHealth> {
    const override = this.overrides.get(node.id);
    const status: ReplicaStatus = override?.status ?? node.status;
    const lagMs = override?.lagMs ?? node.lagMs;
    const checkedAt = epochToIso(Date.now());
    return {
      nodeId: node.id,
      status,
      lagMs,
      checkedAt,
      errorMessage: status !== "healthy" ? `Node ${node.id} is ${status}` : undefined,
    };
  }
}

/** Aggregate health across a list of nodes. */
export async function checkAllNodes(
  nodes: readonly ReplicaNode[],
  checker: HealthChecker
): Promise<Map<string, ReplicaHealth>> {
  const results = await Promise.all(nodes.map((n) => checker.check(n)));
  const map = new Map<string, ReplicaHealth>();
  for (const r of results) {
    map.set(r.nodeId, r);
  }
  return map;
}

/** Convenience function to check health of a single node using the default in-memory checker. */
export async function checkHealth(
  node: ReplicaNode,
  checker?: HealthChecker
): Promise<ReplicaHealth> {
  const c = checker ?? new InMemoryHealthChecker();
  return c.check(node);
}
