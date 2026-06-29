// Sharding strategy definitions: hash, range, directory, and composite.

import { z } from "zod";

/** Partition a keyspace by hashing the shard key modulo N. */
export const HashStrategySchema = z.object({
  kind: z.literal("hash"),
  /** Number of logical shards. */
  shardCount: z.number().int().min(1),
  /** Optional virtual node multiplier for consistent hashing. */
  vnodeFactor: z.number().int().min(1).default(150),
});
export type HashStrategy = z.infer<typeof HashStrategySchema>;

/** Partition a keyspace by explicit key ranges (e.g., lexicographic prefixes). */
export const RangeStrategySchema = z.object({
  kind: z.literal("range"),
  /** Ordered range boundaries; values < boundaries[0] go to shard 0, etc. */
  boundaries: z.array(z.string()).min(1),
});
export type RangeStrategy = z.infer<typeof RangeStrategySchema>;

/** Partition by an explicit key→shardId directory (small, static datasets). */
export const DirectoryStrategySchema = z.object({
  kind: z.literal("directory"),
  /** Mapping from canonical key to shard identifier. */
  mapping: z.record(z.string(), z.string()),
});
export type DirectoryStrategy = z.infer<typeof DirectoryStrategySchema>;

/** Composite: first apply a hash strategy, then a per-shard range strategy. */
export const CompositeStrategySchema = z.object({
  kind: z.literal("composite"),
  primary: HashStrategySchema,
  secondary: RangeStrategySchema,
});
export type CompositeStrategy = z.infer<typeof CompositeStrategySchema>;

export const ShardingStrategySchema = z.discriminatedUnion("kind", [
  HashStrategySchema,
  RangeStrategySchema,
  DirectoryStrategySchema,
  CompositeStrategySchema,
]);
export type ShardingStrategy = z.infer<typeof ShardingStrategySchema>;

/** Resolve the shard index for a given key under a hash strategy. */
export function resolveHashShard(key: string, strategy: HashStrategy, hashFn: (k: string) => number): number {
  const h = hashFn(key);
  return h % strategy.shardCount;
}

/** Resolve the shard index for a given key under a range strategy. */
export function resolveRangeShard(key: string, strategy: RangeStrategy): number {
  for (let i = 0; i < strategy.boundaries.length; i++) {
    if (key < strategy.boundaries[i]!) return i;
  }
  return strategy.boundaries.length;
}

/** Resolve a shard id for a given key under a directory strategy. */
export function resolveDirectoryShard(key: string, strategy: DirectoryStrategy): string | undefined {
  return strategy.mapping[key];
}
