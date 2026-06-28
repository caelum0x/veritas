// In-memory implementation of the DataWarehouse port.
import { ok, err, Result } from "@veritas/core";
import type { TableDescriptor } from "./table.js";
import type { DataWarehouse } from "./warehouse.js";
import type {
  QueryOptions,
  QueryResult,
  LoadResult,
  RowRecord,
} from "./types.js";
import { isCompatible } from "./column.js";

type Row = Readonly<Record<string, unknown>>;

interface TableStore {
  readonly descriptor: TableDescriptor;
  rows: Row[];
}

function qualKey(schema: string, name: string): string {
  return `${schema}.${name}`;
}

function matchesFilters(
  row: Row,
  filters: NonNullable<QueryOptions["filters"]>
): boolean {
  for (const f of filters) {
    const val = (row as Record<string, unknown>)[f.column];
    const fv = f.value;
    switch (f.op) {
      case "eq":
        if (val !== fv) return false;
        break;
      case "neq":
        if (val === fv) return false;
        break;
      case "gt":
        if (!(typeof val === "number" && typeof fv === "number" && val > fv))
          return false;
        break;
      case "gte":
        if (!(typeof val === "number" && typeof fv === "number" && val >= fv))
          return false;
        break;
      case "lt":
        if (!(typeof val === "number" && typeof fv === "number" && val < fv))
          return false;
        break;
      case "lte":
        if (!(typeof val === "number" && typeof fv === "number" && val <= fv))
          return false;
        break;
      case "in":
        if (!(Array.isArray(fv) && (fv as unknown[]).includes(val)))
          return false;
        break;
      case "like":
        if (
          !(
            typeof val === "string" &&
            typeof fv === "string" &&
            val.includes(fv.replace(/%/g, ""))
          )
        )
          return false;
        break;
    }
  }
  return true;
}

export class MemoryWarehouse implements DataWarehouse {
  private readonly tables = new Map<string, TableStore>();

  async registerTable(descriptor: TableDescriptor): Promise<Result<void>> {
    const key = qualKey(descriptor.schema, descriptor.name);
    if (this.tables.has(key)) {
      return err(new Error(`Table already registered: ${key}`));
    }
    this.tables.set(key, { descriptor, rows: [] });
    return ok(undefined);
  }

  private getStore(schema: string, name: string): Result<TableStore> {
    const key = qualKey(schema, name);
    const store = this.tables.get(key);
    if (!store) return err(new Error(`Unknown table: ${key}`));
    return ok(store);
  }

  async dropTable(schema: string, name: string): Promise<Result<void>> {
    const key = qualKey(schema, name);
    if (!this.tables.has(key)) {
      return err(new Error(`Unknown table: ${key}`));
    }
    this.tables.delete(key);
    return ok(undefined);
  }

  async listTables(schema?: string): Promise<Result<readonly TableDescriptor[]>> {
    const descriptors = Array.from(this.tables.values())
      .filter((s) => schema === undefined || s.descriptor.schema === schema)
      .map((s) => s.descriptor);
    return ok(descriptors);
  }

  async getTable(schema: string, name: string): Promise<Result<TableDescriptor>> {
    const res = this.getStore(schema, name);
    if (!res.ok) return err(res.error);
    return ok(res.value.descriptor);
  }

  async query(
    schema: string,
    name: string,
    options: QueryOptions = {}
  ): Promise<Result<QueryResult>> {
    const storeRes = this.getStore(schema, name);
    if (!storeRes.ok) return err(storeRes.error);
    const store = storeRes.value;

    const start = Date.now();
    let rows: Row[] = [...store.rows];

    if (options.filters && options.filters.length > 0) {
      rows = rows.filter((r) =>
        matchesFilters(r, options.filters as NonNullable<QueryOptions["filters"]>)
      );
    }

    const totalRows = rows.length;

    if (options.sort && options.sort.length > 0) {
      const sorts = options.sort;
      rows = [...rows].sort((a, b) => {
        for (const s of sorts) {
          const av = (a as Record<string, unknown>)[s.column];
          const bv = (b as Record<string, unknown>)[s.column];
          if (av === bv) continue;
          const dir = s.direction === "asc" ? 1 : -1;
          if (av === null || av === undefined) return dir;
          if (bv === null || bv === undefined) return -dir;
          if (typeof av === "number" && typeof bv === "number")
            return (av - bv) * dir;
          return String(av).localeCompare(String(bv)) * dir;
        }
        return 0;
      });
    }

    if (options.offset && options.offset > 0) {
      rows = rows.slice(options.offset);
    }
    if (options.limit !== undefined) {
      rows = rows.slice(0, options.limit);
    }

    if (options.columns && options.columns.length > 0) {
      const cols = new Set(options.columns);
      rows = rows.map((r) =>
        Object.freeze(
          Object.fromEntries(
            Object.entries(r).filter(([k]) => cols.has(k))
          )
        )
      );
    }

    return ok({
      rows: rows as QueryResult["rows"],
      totalRows,
      executionMs: Date.now() - start,
    });
  }

  async load(
    schema: string,
    name: string,
    rows: readonly RowRecord[]
  ): Promise<Result<LoadResult>> {
    const storeRes = this.getStore(schema, name);
    if (!storeRes.ok) return err(storeRes.error);
    const store = storeRes.value;

    let inserted = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      let valid = true;
      for (const col of store.descriptor.columns) {
        const val = (row as Record<string, unknown>)[col.name];
        if (!isCompatible(val, col)) {
          errors.push(
            `Row ${i}: column '${col.name}' type mismatch: got ${typeof val}, expected ${col.type}`
          );
          valid = false;
          break;
        }
      }
      if (valid) {
        store.rows = [...store.rows, Object.freeze({ ...row })];
        inserted++;
      }
    }

    return ok({ inserted, failed: errors.length, errors });
  }

  async deleteRows(
    schema: string,
    name: string,
    filters: NonNullable<QueryOptions["filters"]>
  ): Promise<Result<number>> {
    const storeRes = this.getStore(schema, name);
    if (!storeRes.ok) return err(storeRes.error);
    const store = storeRes.value;

    const before = store.rows.length;
    store.rows = store.rows.filter((r) => !matchesFilters(r, filters));
    return ok(before - store.rows.length);
  }

  async ping(): Promise<Result<void>> {
    return ok(undefined);
  }
}
