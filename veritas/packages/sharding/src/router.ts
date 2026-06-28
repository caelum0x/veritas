// Route a shard key to the appropriate shard using the configured strategy.

import { ok, err, type Result, type AppError, InternalError } from "@veritas/core";
import { type Shard } from "./shard.js";
import { type ShardKey, makeShardKey } from "./shard-key.js";
import { type ConsistentHashRing, lookupRing } from "./ring.js";
import { type ShardingStrategy } from "./strategy.js";

export interface RouterConfig {
  readonly strategy: ShardingStrategy;
  /** Ring used for consistent-hash routing (required when strategy kind is "hash"). */
  readonly ring?: ConsistentHashRing;
  /** Ordered shard list used for range / round-robin routing. */
  readonly shards?: ReadonlyArray<Shard>;
}

export interface ShardRouter {
  /** Route a raw discriminant string to the target shard. */
  route(discriminant: string): Result<Shard, AppError>;
  /** Route an already-constructed ShardKey. */
  routeKey(key: ShardKey): Result<Shard, AppError>;
}

let _rrIndex = 0; // module-level counter for round-robin

/** Build a stateless router for the given configuration. */
export function buildRouter(config: RouterConfig): ShardRouter {
  function routeKey(key: ShardKey): Result<Shard, AppError> {
    switch (config.strategy.kind) {
      case "hash": {
        if (!config.ring) {
          return err(new InternalError({ message: "Router requires a ring for hash strategy" }));
        }
        const shard = lookupRing(config.ring, key);
        if (!shard) {
          return err(new InternalError({ message: "No shard found in ring for key" }));
        }
        return ok(shard);
      }

      case "range": {
        const shards = config.shards ?? [];
        if (shards.length === 0) {
          return err(new InternalError({ message: "Router has no shards configured" }));
        }
        // Simple lexicographic range: use first char of key to bucket.
        const firstChar = key.charCodeAt(0) || 0;
        const idx = firstChar % shards.length;
        const shard = shards[idx];
        if (shard === undefined) {
          return err(new InternalError({ message: "No shard found at computed range index" }));
        }
        return ok(shard);
      }

      case "directory": {
        const shards = config.shards ?? [];
        if (shards.length === 0) {
          return err(new InternalError({ message: "Router has no shards configured" }));
        }
        const shardId = config.strategy.mapping[key];
        const shard = shardId !== undefined ? shards.find((s) => s.id === shardId) : undefined;
        if (shard === undefined) {
          return err(new InternalError({ message: `No shard found in directory for key: ${key}` }));
        }
        return ok(shard);
      }

      case "composite": {
        const shards = config.shards ?? [];
        if (shards.length === 0) {
          return err(new InternalError({ message: "Router has no shards configured" }));
        }
        const firstChar = key.charCodeAt(0) || 0;
        const idx = firstChar % shards.length;
        const shard = shards[idx];
        if (shard === undefined) {
          return err(new InternalError({ message: "No shard found at computed composite index" }));
        }
        return ok(shard);
      }

      default: {
        return err(new InternalError({ message: "Unknown sharding strategy kind" }));
      }
    }
  }

  return {
    route(discriminant: string): Result<Shard, AppError> {
      return routeKey(makeShardKey(discriminant));
    },
    routeKey,
  };
}
