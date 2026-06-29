// Ordered migration registry — maintains insertion-order list of all migrations
import type { Migration } from "./migration.js";

/** Ordered, de-duplicated collection of Migration definitions. */
export class MigrationRegistry {
  private readonly migrations: Migration[] = [];
  private readonly index = new Map<string, Migration>();

  /** Register a migration; throws if the id is already registered. */
  register(migration: Migration): void {
    if (this.index.has(migration.id)) {
      throw new Error(
        `Migration with id "${migration.id}" is already registered.`
      );
    }
    this.migrations.push(migration);
    this.index.set(migration.id, migration);
  }

  /** Return all migrations in registration order. */
  all(): ReadonlyArray<Migration> {
    return this.migrations;
  }

  /** Return the migration with the given id, or undefined. */
  find(id: string): Migration | undefined {
    return this.index.get(id);
  }
}

/** Singleton registry used by all migration files in this package. */
export const globalRegistry = new MigrationRegistry();
