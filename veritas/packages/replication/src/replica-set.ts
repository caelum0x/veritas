// Replica set management — create, mutate (immutably), and query replica sets.
import { ok, err, type Result } from "@veritas/core";
import { z } from "zod";
import type { ReplicaSet, ReplicaNode, ReplicaSetConfig } from "./types.js";
import { ReplicaSetConfigSchema, ReplicaNodeSchema } from "./types.js";
import { ReplicationError, ReplicaSetNotFoundError } from "./errors.js";

/** Create a new ReplicaSet from a validated config. */
export function makeReplicaSet(raw: unknown): Result<ReplicaSet> {
  const parsed = ReplicaSetConfigSchema.safeParse(raw);
  if (!parsed.success) {
    return err(new ReplicationError(`Invalid replica set config: ${parsed.error.message}`));
  }
  const config: ReplicaSetConfig = parsed.data;
  return ok({ config, nodes: config.nodes });
}

/** Return a new ReplicaSet with the given node added (immutable). */
export function addReplica(set: ReplicaSet, raw: unknown): Result<ReplicaSet> {
  const parsed = ReplicaNodeSchema.safeParse(raw);
  if (!parsed.success) {
    return err(new ReplicationError(`Invalid replica node: ${parsed.error.message}`));
  }
  const node: ReplicaNode = parsed.data;
  if (set.nodes.some((n) => n.id === node.id)) {
    return err(new ReplicationError(`Replica with id '${node.id}' already exists in set '${set.config.setId}'`));
  }
  const nodes = [...set.nodes, node];
  return ok({ config: { ...set.config, nodes }, nodes });
}

/** Return a new ReplicaSet with the node matching nodeId removed (immutable). */
export function removeReplica(set: ReplicaSet, nodeId: string): Result<ReplicaSet> {
  const node = set.nodes.find((n) => n.id === nodeId);
  if (!node) {
    return err(new ReplicaSetNotFoundError(nodeId));
  }
  if (node.role === "primary") {
    return err(new ReplicationError("Cannot remove the primary node without first promoting a replica"));
  }
  const nodes = set.nodes.filter((n) => n.id !== nodeId);
  return ok({ config: { ...set.config, nodes }, nodes });
}

/** Return the primary node of a replica set, or an error if none is healthy. */
export function getPrimary(set: ReplicaSet): Result<ReplicaNode> {
  const primary = set.nodes.find((n) => n.role === "primary" && n.status === "healthy");
  if (!primary) {
    return err(new ReplicationError(`No healthy primary in replica set '${set.config.setId}'`));
  }
  return ok(primary);
}

/** Return all replica (non-primary) nodes in a replica set. */
export function getReplicas(set: ReplicaSet): ReadonlyArray<ReplicaNode> {
  return set.nodes.filter((n) => n.role === "replica");
}
