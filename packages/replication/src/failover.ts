// Replica failover — elect a new primary when the current one is unhealthy.
import { ok, err, type Result } from "@veritas/core";
import { epochToIso } from "@veritas/core";
import type { ReplicaSet, ReplicaNode, FailoverResult, FailoverPolicy } from "./types.js";
import { FailoverError } from "./errors.js";

export interface FailoverOptions {
  readonly policy: FailoverPolicy;
  readonly reason: string;
}

/**
 * Elect the highest-priority healthy replica as the new primary.
 * Returns an updated ReplicaSet and the failover result.
 */
export function electPrimary(
  set: ReplicaSet,
  opts: FailoverOptions
): Result<{ set: ReplicaSet; result: FailoverResult }> {
  const currentPrimary = set.nodes.find((n) => n.role === "primary");
  if (!currentPrimary) {
    return err(new FailoverError("No current primary to fail over from"));
  }

  const candidates = set.nodes
    .filter((n) => n.role === "replica" && n.status === "healthy")
    .slice()
    .sort((a, b) => b.weight - a.weight); // highest weight first

  if (candidates.length === 0) {
    return err(new FailoverError("No healthy replicas available to promote as primary"));
  }

  const newPrimary = candidates[0]!;
  const now = epochToIso(Date.now());

  // Build new node list: demote old primary, promote new primary (immutable)
  const nodes: ReadonlyArray<ReplicaNode> = set.nodes.map((n) => {
    if (n.id === currentPrimary.id) return { ...n, role: "replica" as const, status: "degraded" as const };
    if (n.id === newPrimary.id) return { ...n, role: "primary" as const };
    return n;
  });

  const updatedSet: ReplicaSet = {
    config: { ...set.config, nodes: [...nodes] },
    nodes,
  };

  const result: FailoverResult = {
    previousPrimary: currentPrimary.id,
    newPrimary: newPrimary.id,
    triggeredAt: now,
    reason: opts.reason,
  };

  return ok({ set: updatedSet, result });
}

/**
 * Top-level failover trigger — evaluates policy and delegates to electPrimary.
 * Manual policy requires the caller to invoke this explicitly; auto runs immediately.
 */
export function triggerFailover(
  set: ReplicaSet,
  reason: string,
  policy: FailoverPolicy = "auto"
): Result<{ set: ReplicaSet; result: FailoverResult }> {
  return electPrimary(set, { policy, reason });
}

/** Stateful failover manager that tracks failover history. */
export class FailoverManager {
  private readonly history: FailoverResult[] = [];

  constructor(private set: ReplicaSet) {}

  /** Trigger a failover and update internal state if successful. */
  trigger(reason: string, policy: FailoverPolicy = "auto"): Result<FailoverResult> {
    const result = triggerFailover(this.set, reason, policy);
    if (!result.ok) return result as unknown as Result<FailoverResult>;
    this.set = result.value.set;
    this.history.push(result.value.result);
    return ok(result.value.result);
  }

  /** Return current replica set state. */
  getSet(): ReplicaSet {
    return this.set;
  }

  /** Return full failover history. */
  getHistory(): ReadonlyArray<FailoverResult> {
    return this.history;
  }
}
