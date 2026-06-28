// DataWarehouse port — defines the interface for querying and loading warehouse tables.
import type { Result } from "@veritas/core";
import type { TableDescriptor } from "./table.js";
import type { QueryOptions, QueryResult, LoadResult, RowRecord } from "./types.js";

/** Port interface for a columnar data warehouse. */
export interface DataWarehouse {
  /** Register a table descriptor in the warehouse. */
  registerTable(table: TableDescriptor): Promise<Result<void>>;

  /** Remove a table descriptor from the warehouse. */
  dropTable(schema: string, name: string): Promise<Result<void>>;

  /** List all registered table descriptors. */
  listTables(schema?: string): Promise<Result<readonly TableDescriptor[]>>;

  /** Retrieve a table descriptor by schema and name. */
  getTable(schema: string, name: string): Promise<Result<TableDescriptor>>;

  /** Execute a query against a table and return matching rows. */
  query(
    schema: string,
    name: string,
    options?: QueryOptions
  ): Promise<Result<QueryResult>>;

  /** Bulk-insert rows into a table. */
  load(
    schema: string,
    name: string,
    rows: readonly RowRecord[]
  ): Promise<Result<LoadResult>>;

  /** Delete rows matching the given filters from a table. */
  deleteRows(
    schema: string,
    name: string,
    filters: NonNullable<QueryOptions["filters"]>
  ): Promise<Result<number>>;

  /** Check connectivity / health of the warehouse. */
  ping(): Promise<Result<void>>;
}
