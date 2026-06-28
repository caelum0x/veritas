// SagaStateStore: port interface and in-memory implementation for saga state persistence.

import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { SagaState } from "./state.js";
import { SagaNotFoundError, SagaAlreadyCompletedError } from "./errors.js";

/** Port interface: any durable backend must implement this. */
export interface SagaStorePort {
  /** Persist a new saga state; fails if the sagaId already exists. */
  save(state: SagaState): Promise<Result<SagaState, SagaAlreadyCompletedError | Error>>;
  /** Replace an existing saga state; fails if not found. */
  update(state: SagaState): Promise<Result<SagaState, SagaNotFoundError | Error>>;
  /** Retrieve a saga state by id. */
  findById(sagaId: string): Promise<Result<SagaState, SagaNotFoundError>>;
  /** List all saga states (used for admin/monitoring). */
  list(): Promise<Result<readonly SagaState[], never>>;
  /** Remove a saga state (for testing/cleanup). */
  delete(sagaId: string): Promise<Result<void, SagaNotFoundError>>;
}

/** In-memory implementation suitable for testing and single-process deployments. */
export class InMemorySagaStore implements SagaStorePort {
  private readonly states = new Map<string, SagaState>();

  async save(state: SagaState): Promise<Result<SagaState, SagaAlreadyCompletedError | Error>> {
    if (this.states.has(state.sagaId)) {
      return err(new SagaAlreadyCompletedError(state.sagaId));
    }
    this.states.set(state.sagaId, state);
    return ok(state);
  }

  async update(state: SagaState): Promise<Result<SagaState, SagaNotFoundError | Error>> {
    if (!this.states.has(state.sagaId)) {
      return err(new SagaNotFoundError(state.sagaId));
    }
    this.states.set(state.sagaId, state);
    return ok(state);
  }

  async findById(sagaId: string): Promise<Result<SagaState, SagaNotFoundError>> {
    const state = this.states.get(sagaId);
    if (!state) {
      return err(new SagaNotFoundError(sagaId));
    }
    return ok(state);
  }

  async list(): Promise<Result<readonly SagaState[], never>> {
    return ok(Array.from(this.states.values()));
  }

  async delete(sagaId: string): Promise<Result<void, SagaNotFoundError>> {
    if (!this.states.has(sagaId)) {
      return err(new SagaNotFoundError(sagaId));
    }
    this.states.delete(sagaId);
    return ok(undefined);
  }

  /** Snapshot the current store size (useful in tests). */
  get size(): number {
    return this.states.size;
  }
}
