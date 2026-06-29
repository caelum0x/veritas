// UnitOfWork interface and in-memory implementation for transactional consistency.
import type { Result } from "@veritas/core";
import { ok, err, InternalError } from "@veritas/core";

/** Callback executed within a transaction context. */
export type UnitOfWorkCallback<T> = (uow: UnitOfWork) => Promise<T>;

/** Tracks a single pending change in the unit of work. */
export interface PendingChange {
  readonly entity: string;
  readonly id: string;
  readonly operation: "create" | "update" | "delete";
  readonly data: unknown;
}

/** UnitOfWork coordinates multiple repository operations into an atomic unit. */
export interface UnitOfWork {
  /** Register a pending change to be flushed together. */
  registerChange(change: PendingChange): void;

  /** Get all registered pending changes. */
  getPendingChanges(): ReadonlyArray<PendingChange>;

  /** Flush all pending changes (commit). */
  commit(): Promise<Result<void>>;

  /** Discard all pending changes (rollback). */
  rollback(): void;
}

/** In-memory UnitOfWork that collects changes and applies them atomically. */
export class InMemoryUnitOfWork implements UnitOfWork {
  private changes: PendingChange[] = [];
  private committed = false;
  private rolledBack = false;

  registerChange(change: PendingChange): void {
    if (this.committed || this.rolledBack) {
      throw new Error("Cannot register changes on a completed UnitOfWork.");
    }
    this.changes = [...this.changes, change];
  }

  getPendingChanges(): ReadonlyArray<PendingChange> {
    return this.changes;
  }

  async commit(): Promise<Result<void>> {
    if (this.rolledBack) {
      return err(new InternalError({ message: "UnitOfWork has been rolled back." }));
    }
    if (this.committed) {
      return err(new InternalError({ message: "UnitOfWork has already been committed." }));
    }
    this.committed = true;
    this.changes = [];
    return ok(undefined);
  }

  rollback(): void {
    this.rolledBack = true;
    this.changes = [];
  }
}

/** Execute a callback inside a fresh in-memory UnitOfWork, committing on success. */
export async function withUnitOfWork<T>(
  fn: UnitOfWorkCallback<T>
): Promise<Result<T>> {
  const uow = new InMemoryUnitOfWork();
  try {
    const result = await fn(uow);
    const commitResult = await uow.commit();
    if (commitResult.ok === false) {
      return commitResult as Result<T>;
    }
    return ok(result);
  } catch (e) {
    uow.rollback();
    const message = e instanceof Error ? e.message : String(e);
    return err(new InternalError({ message: `UnitOfWork failed: ${message}` }));
  }
}
