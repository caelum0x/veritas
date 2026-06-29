// Domain errors for the replication package.
import { AppError, type AppErrorOptions } from "@veritas/core";

export class ReplicationError extends AppError {
  constructor(message: string, opts?: Partial<AppErrorOptions>) {
    super("UNAVAILABLE", 503, message, opts);
  }
}

export class NoReplicaAvailableError extends ReplicationError {
  constructor(reason?: string) {
    super(reason ?? "No healthy replica node is available to serve the request");
  }
}

/** @deprecated Use NoReplicaAvailableError */
export class NoHealthyReplicaError extends NoReplicaAvailableError {
  constructor(opts?: Partial<AppErrorOptions>) {
    super(opts?.message);
  }
}

export class LagExceededError extends ReplicationError {
  constructor(readonly nodeId: string, readonly lagMs: number, readonly maxLagMs: number) {
    super(`Replica ${nodeId} lag ${lagMs}ms exceeds maximum ${maxLagMs}ms`, {
      details: { nodeId, lagMs, maxLagMs },
    });
  }
}

/** @deprecated Use LagExceededError */
export class ReplicaLagExceededError extends LagExceededError {}

export class FailoverError extends ReplicationError {
  constructor(reason: string) {
    super(`Failover failed: ${reason}`);
  }
}

/** @deprecated Use FailoverError */
export class FailoverExhaustedError extends FailoverError {
  constructor(attempted: string[]) {
    super(`All failover candidates exhausted: [${attempted.join(", ")}]`);
  }
}

export class ConsistencyError extends ReplicationError {
  constructor(required: string, available: string) {
    super(`Cannot satisfy consistency level '${required}' with available nodes: ${available}`);
  }
}

export class ReplicaSetNotFoundError extends AppError {
  constructor(setId: string) {
    super("NOT_FOUND", 404, `Replica set '${setId}' not found`, { details: { setId } });
  }
}
