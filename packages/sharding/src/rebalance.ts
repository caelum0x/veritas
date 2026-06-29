// Compute a rebalance plan describing which keys must move between shards.

import { type Shard } from "./shard.js";
import { type ShardKey, slotOf } from "./shard-key.js";

/** A single key migration instruction. */
export interface KeyMove {
  readonly key: ShardKey;
  readonly fromShardId: string;
  readonly toShardId: string;
}

/** Summary plan produced by the rebalancer. */
export interface RebalancePlan {
  readonly moves: ReadonlyArray<KeyMove>;
  readonly fromShards: ReadonlyArray<Shard>;
  readonly toShards: ReadonlyArray<Shard>;
  readonly totalKeys: number;
  readonly movedKeys: number;
}

/**
 * Compute the minimal set of key moves required to transition from one shard
 * layout (fromShards) to another (toShards) for the given key population.
 * Uses slot-based assignment so only keys that change slot ownership are moved.
 */
export function planRebalance(
  keys: ReadonlyArray<ShardKey>,
  fromShards: ReadonlyArray<Shard>,
  toShards: ReadonlyArray<Shard>,
): RebalancePlan {
  if (fromShards.length === 0 || toShards.length === 0) {
    return {
      moves: [],
      fromShards,
      toShards,
      totalKeys: keys.length,
      movedKeys: 0,
    };
  }

  const moves: KeyMove[] = [];

  for (const key of keys) {
    const fromIdx = slotOf(key, fromShards.length);
    const toIdx = slotOf(key, toShards.length);
    const fromShard = fromShards[fromIdx];
    const toShard = toShards[toIdx];

    if (fromShard !== undefined && toShard !== undefined && fromShard.id !== toShard.id) {
      moves.push({ key, fromShardId: fromShard.id, toShardId: toShard.id });
    }
  }

  return {
    moves,
    fromShards,
    toShards,
    totalKeys: keys.length,
    movedKeys: moves.length,
  };
}

/**
 * Estimate the percentage of keys that would need to move.
 * Useful for capacity planning before committing to a rebalance.
 */
export function rebalanceImpact(plan: RebalancePlan): number {
  if (plan.totalKeys === 0) return 0;
  return (plan.movedKeys / plan.totalKeys) * 100;
}

/** Group moves by destination shard for parallel execution. */
export function groupMovesByTarget(plan: RebalancePlan): ReadonlyMap<string, ReadonlyArray<KeyMove>> {
  const map = new Map<string, KeyMove[]>();
  for (const move of plan.moves) {
    const bucket = map.get(move.toShardId) ?? [];
    bucket.push(move);
    map.set(move.toShardId, bucket);
  }
  return map;
}
