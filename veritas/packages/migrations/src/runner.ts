// Migration runner — applies or reverts pending migrations under lock
import type { Pool } from "./migration.js";
import { MigrationRegistry } from "./registry.js";
import { PgStateStore } from "./state-store.js";
import { MigrationLock } from "./lock.js";
import { computePlan } from "./plan.js";

export interface RunnerOptions {
  /** Execute at most this many migrations per run (default: all pending). */
  limit?: number;
}

export interface RunResult {
  readonly applied: ReadonlyArray<string>;
  readonly reverted: ReadonlyArray<string>;
}

/** Orchestrates migration execution: locking, planning, applying, and recording state. */
export class MigrationRunner {
  private readonly store: PgStateStore;
  private readonly lock: MigrationLock;

  constructor(
    private readonly pool: Pool,
    private readonly registry: MigrationRegistry
  ) {
    this.store = new PgStateStore(pool);
    this.lock = new MigrationLock(pool);
  }

  /** Apply all pending migrations in order. */
  async up(options: RunnerOptions = {}): Promise<RunResult> {
    return this.lock.withLock(async () => {
      await this.store.ensureTable();
      const plan = await computePlan(this.registry.all(), this.store);
      const toApply =
        options.limit !== undefined
          ? plan.pending.slice(0, options.limit)
          : plan.pending;

      const applied: string[] = [];
      for (const migration of toApply) {
        await migration.up(this.pool);
        await this.store.markApplied(migration.id);
        applied.push(migration.id);
      }
      return { applied, reverted: [] };
    });
  }

  /** Revert the last N applied migrations (default: 1). */
  async down(steps = 1): Promise<RunResult> {
    return this.lock.withLock(async () => {
      await this.store.ensureTable();
      const appliedRecords = await this.store.listApplied();
      const toRevert = appliedRecords.slice(-steps).reverse();

      const reverted: string[] = [];
      for (const record of toRevert) {
        const migration = this.registry.find(record.id);
        if (!migration) {
          throw new Error(
            `Cannot revert migration "${record.id}": not found in registry.`
          );
        }
        await migration.down(this.pool);
        await this.store.markReverted(record.id);
        reverted.push(record.id);
      }
      return { applied: [], reverted };
    });
  }

  /** Return the current migration status without mutating state. */
  async status(): Promise<{ pending: string[]; applied: string[] }> {
    await this.store.ensureTable();
    const plan = await computePlan(this.registry.all(), this.store);
    return {
      pending: plan.pending.map((m) => m.id),
      applied: [...plan.applied],
    };
  }
}
