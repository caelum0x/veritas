// Public surface of @veritas/replication — replica set, routing, lag, failover, and consistency.
export type {
  ReplicaId,
  ReplicaRole,
  ReplicaStatus,
  ReplicaNode,
  ReplicaSet,
  ReplicaSetConfig,
  ReadConsistency,
  WriteConsistency,
  ReplicaHealth,
  ReplicaLag,
  FailoverPolicy,
  FailoverResult,
  RouterOptions,
  SplitOptions,
} from './types.js';

export {
  makeReplicaSet,
  addReplica,
  removeReplica,
  getPrimary,
  getReplicas,
} from './replica-set.js';

export {
  routeRead,
  routeWrite,
  createReadWriteSplit,
} from './read-write-split.js';

export {
  trackLag,
  getLag,
  isLagAcceptable,
  LagTracker,
} from './lag.js';

export {
  triggerFailover,
  electPrimary,
  FailoverManager,
} from './failover.js';

export {
  satisfiesConsistency,
  ReadConsistencyLevel,
  WriteConsistencyLevel,
} from './consistency.js';

export {
  createRouter,
  ReplicaRouter,
} from './router.js';

export {
  checkHealth,
  HealthChecker,
} from './health.js';

export {
  wrapRepositoryWithSplit,
} from './repository-wrapper.js';

export {
  ReplicationError,
  NoReplicaAvailableError,
  LagExceededError,
  FailoverError,
  ConsistencyError,
} from './errors.js';
