// Consistent hash ring: maps virtual nodes to physical shards.

import { sha256Hex } from "@veritas/core";
import { type Shard } from "./shard.js";
import { type ShardKey } from "./shard-key.js";

interface VNode {
  readonly position: number; // 0 – 2^32-1
  readonly shardId: string;
}

export interface ConsistentHashRing {
  readonly vnodes: ReadonlyArray<VNode>;
  readonly shards: ReadonlyMap<string, Shard>;
}

/** Default virtual nodes per shard replica count. */
export const DEFAULT_REPLICAS = 150;

/** Build a new ring from a list of shards. */
export function buildRing(shards: readonly Shard[], replicas = DEFAULT_REPLICAS): ConsistentHashRing {
  const shardMap = new Map<string, Shard>(shards.map((s) => [s.id, s]));
  const vnodes: VNode[] = [];

  for (const shard of shards) {
    const count = replicas * shard.weight;
    for (let i = 0; i < count; i++) {
      const key = `${shard.id}#${i}`;
      const hex = sha256Hex(key).slice(0, 8);
      const position = parseInt(hex, 16);
      vnodes.push({ position, shardId: shard.id });
    }
  }

  vnodes.sort((a, b) => a.position - b.position);
  return { vnodes, shards: shardMap };
}

/** Resolve a ShardKey to the responsible Shard using clockwise lookup. */
export function lookupRing(ring: ConsistentHashRing, key: ShardKey): Shard | undefined {
  if (ring.vnodes.length === 0) return undefined;

  const hex = sha256Hex(key).slice(0, 8);
  const position = parseInt(hex, 16);

  // Binary search for the first vnode >= position (wrap around at end).
  let lo = 0;
  let hi = ring.vnodes.length - 1;
  let result: VNode | undefined = ring.vnodes[0];

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const node: VNode | undefined = ring.vnodes[mid];
    if (node !== undefined && node.position >= position) {
      result = node;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }

  if (result === undefined) return undefined;
  return ring.shards.get(result.shardId);
}

/** Add a shard to an existing ring (returns a new ring – immutable). */
export function addShardToRing(ring: ConsistentHashRing, shard: Shard, replicas = DEFAULT_REPLICAS): ConsistentHashRing {
  const shards = [...ring.shards.values(), shard];
  return buildRing(shards, replicas);
}

/** Remove a shard from a ring (returns a new ring – immutable). */
export function removeShardFromRing(ring: ConsistentHashRing, shardId: string, replicas = DEFAULT_REPLICAS): ConsistentHashRing {
  const shards = [...ring.shards.values()].filter((s) => s.id !== shardId);
  return buildRing(shards, replicas);
}
