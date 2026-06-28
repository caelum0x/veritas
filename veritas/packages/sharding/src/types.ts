// Core types for the sharding module: shard descriptors, ring nodes, routes, and plans.

import type { Id } from "@veritas/core";

/** Opaque brand for shard identifiers. */
export type ShardId = Id<"Shard">;

/** Opaque brand for virtual node identifiers on the ring. */
export type VNodeId = Id<"VNode">;

/** Physical or logical shard descriptor. */
export interface Shard {
  readonly id: ShardId;
  readonly label: string;
  readonly weight: number; // relative capacity weight (default 1)
  readonly metadata: Readonly<Record<string, string>>;
  readonly createdAt: string;
}

/** A virtual node placed on the consistent-hash ring. */
export interface VNode {
  readonly id: VNodeId;
  readonly shardId: ShardId;
  readonly token: number; // position on the ring [0, MAX_TOKEN)
}

/** Result of routing a key to a shard. */
export interface RouteResult {
  readonly key: string;
  readonly hash: number;
  readonly shardId: ShardId;
  readonly vNodeId: VNodeId;
}

/** Strategy used to determine shard placement. */
export type ShardingStrategy = "consistent-hash" | "range" | "directory";

/** Configuration for the consistent-hash ring. */
export interface RingConfig {
  readonly replicationFactor: number; // virtual nodes per physical shard
  readonly strategy: ShardingStrategy;
}

/** A single rebalance move: key range migrating from one shard to another. */
export interface RebalanceMove {
  readonly fromShardId: ShardId;
  readonly toShardId: ShardId;
  /** Inclusive lower bound token. */
  readonly tokenStart: number;
  /** Exclusive upper bound token. */
  readonly tokenEnd: number;
  readonly estimatedKeys: number;
}

/** Full rebalance plan produced after adding/removing shards. */
export interface RebalancePlan {
  readonly id: string;
  readonly moves: ReadonlyArray<RebalanceMove>;
  readonly createdAt: string;
}

/** Migration step for moving data between shards. */
export interface MigrationStep {
  readonly stepIndex: number;
  readonly move: RebalanceMove;
  readonly status: "pending" | "running" | "done" | "failed";
}

/** A full shard migration plan composed of ordered steps. */
export interface MigrationPlan {
  readonly id: string;
  readonly rebalancePlanId: string;
  readonly steps: ReadonlyArray<MigrationStep>;
  readonly createdAt: string;
}

/** Registry entry mapping shard ids to shard descriptors. */
export type ShardRegistry = Readonly<Map<ShardId, Shard>>;

/** Key derivation input for multi-tenant or composite keys. */
export interface ShardKeyInput {
  readonly tenantId?: string;
  readonly entityType: string;
  readonly entityId: string;
}

/** Derived shard key. */
export interface ShardKey {
  readonly raw: string;
  readonly normalized: string;
}
