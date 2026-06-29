// @veritas/sharding: public surface — shard management, routing, and migration.

export type {
  ShardId,
  VNodeId,
  VNode,
  RouteResult,
  RingConfig,
  RebalanceMove,
  ShardRegistry as ShardRegistryType,
  ShardKeyInput,
} from "./types.js";

export { makeShardKey, slotOf, compositeKey } from "./shard-key.js";
export type { ShardKey } from "./shard-key.js";
export { buildRing, lookupRing, addShardToRing, removeShardFromRing, DEFAULT_REPLICAS } from "./ring.js";
export type { ConsistentHashRing } from "./ring.js";
export { buildRouter } from "./router.js";
export type { ShardRouter, RouterConfig } from "./router.js";
export { planRebalance, rebalanceImpact, groupMovesByTarget } from "./rebalance.js";
export type { KeyMove, RebalancePlan } from "./rebalance.js";
export { makeShard, isWritable, isReadable, ShardSchema, ShardStatusSchema } from "./shard.js";
export type { Shard, ShardStatus } from "./shard.js";
export { resolveHashShard, resolveRangeShard, resolveDirectoryShard, ShardingStrategySchema } from "./strategy.js";
export type { ShardingStrategy, HashStrategy, RangeStrategy, DirectoryStrategy, CompositeStrategy } from "./strategy.js";
export { hashToUint32, hashToRingPosition, compositeHash, normaliseKey } from "./hash.js";
export { InMemoryShardRegistry } from "./registry.js";
export type { ShardRegistry, ShardDescriptor, ShardStatus as RegistryShardStatus } from "./registry.js";
export { planAddShard, planRemoveShard, derivePlanStatus, applyStepUpdate } from "./migration.js";
export type { MigrationStep, MigrationPlan } from "./migration.js";
export { ShardNotFoundError, ShardKeyError, ShardRegistryError, MigrationError, RingError } from "./errors.js";
