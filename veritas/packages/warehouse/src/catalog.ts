// In-memory table catalog — tracks all registered tables and schemas.
import { Result, ok, err } from "@veritas/core";
import type { TableRef } from "./types.js";
import type { ColumnDef, TableKind } from "./types.js";
import {
  TableNotFoundError,
  TableAlreadyExistsError,
  SchemaNotFoundError,
} from "./errors.js";

export interface TableEntry {
  readonly ref: TableRef;
  readonly kind: TableKind;
  readonly columns: readonly ColumnDef[];
  readonly description?: string;
  readonly createdAt: string;
}

export interface CatalogSnapshot {
  readonly schemas: readonly string[];
  readonly tables: readonly TableEntry[];
}

export class TableCatalog {
  readonly #tables: Map<string, TableEntry> = new Map();
  readonly #schemas: Set<string> = new Set();

  #key(ref: TableRef): string {
    return `${ref.schema}.${ref.name}`;
  }

  registerSchema(schema: string): void {
    this.#schemas.add(schema);
  }

  hasSchema(schema: string): boolean {
    return this.#schemas.has(schema);
  }

  listSchemas(): readonly string[] {
    return [...this.#schemas];
  }

  register(entry: Omit<TableEntry, "createdAt">): Result<TableEntry, TableAlreadyExistsError> {
    const key = this.#key(entry.ref);
    if (this.#tables.has(key)) {
      return err(new TableAlreadyExistsError(key));
    }
    if (!this.#schemas.has(entry.ref.schema)) {
      this.#schemas.add(entry.ref.schema);
    }
    const full: TableEntry = { ...entry, createdAt: new Date().toISOString() };
    this.#tables.set(key, full);
    return ok(full);
  }

  deregister(ref: TableRef): Result<void, TableNotFoundError> {
    const key = this.#key(ref);
    if (!this.#tables.has(key)) {
      return err(new TableNotFoundError(key));
    }
    this.#tables.delete(key);
    return ok(undefined);
  }

  get(ref: TableRef): Result<TableEntry, TableNotFoundError> {
    const key = this.#key(ref);
    const entry = this.#tables.get(key);
    if (!entry) return err(new TableNotFoundError(key));
    return ok(entry);
  }

  listBySchema(schema: string): Result<readonly TableEntry[], SchemaNotFoundError> {
    if (!this.#schemas.has(schema)) {
      return err(new SchemaNotFoundError(schema));
    }
    const entries = [...this.#tables.values()].filter(
      (e) => e.ref.schema === schema
    );
    return ok(entries);
  }

  listAll(): readonly TableEntry[] {
    return [...this.#tables.values()];
  }

  snapshot(): CatalogSnapshot {
    return {
      schemas: this.listSchemas(),
      tables: this.listAll(),
    };
  }

  hasTable(ref: TableRef): boolean {
    return this.#tables.has(this.#key(ref));
  }
}
