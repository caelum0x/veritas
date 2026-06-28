// Replication lag tracking — record, retrieve, and evaluate lag per node.
import { epochToIso } from "@veritas/core";
import type { ReplicaLag } from "./types.js";

/** In-memory store of latest lag measurements per node. */
export class LagTracker {
  private readonly lags = new Map<string, ReplicaLag>();

  /** Record a new lag measurement for a node. */
  trackLag(nodeId: string, lagMs: number): ReplicaLag {
    const snapshot: ReplicaLag = {
      nodeId,
      lagMs,
      updatedAt: epochToIso(Date.now()),
    };
    this.lags.set(nodeId, snapshot);
    return snapshot;
  }

  /** Return the latest lag snapshot for a node, or undefined. */
  getLag(nodeId: string): ReplicaLag | undefined {
    return this.lags.get(nodeId);
  }

  /** Return all current lag snapshots. */
  getAll(): ReadonlyArray<ReplicaLag> {
    return Array.from(this.lags.values());
  }

  /** Clear lag data for a node (e.g., on removal). */
  remove(nodeId: string): void {
    this.lags.delete(nodeId);
  }
}

/** Module-level singleton instance. */
const defaultTracker = new LagTracker();

/** Record lag for a node (uses default tracker). */
export function trackLag(nodeId: string, lagMs: number): ReplicaLag {
  return defaultTracker.trackLag(nodeId, lagMs);
}

/** Get latest lag for a node (uses default tracker). */
export function getLag(nodeId: string): ReplicaLag | undefined {
  return defaultTracker.getLag(nodeId);
}

/** Check whether a node's lag is within the acceptable threshold. */
export function isLagAcceptable(nodeId: string, maxLagMs: number): boolean {
  const snapshot = defaultTracker.getLag(nodeId);
  if (!snapshot) return true; // no data: assume acceptable
  return snapshot.lagMs <= maxLagMs;
}
