// Maps query-engine ResultSet and DataSource entries to HTTP response shapes.
import type { ResultSet, DataSourceRegistry } from "@veritas/query-engine";
import type { QueryResult, DataSourceSummary } from "./queries.schema.js";

export function toQueryResult(rs: ResultSet, executionMs: number): QueryResult {
  return {
    columns: rs.columns.map((c) => ({ name: c.name, index: c.index })),
    rows: rs.rows as Record<string, unknown>[],
    totalRows: rs.totalRows,
    returnedRows: rs.rows.length,
    executionMs,
  };
}

export function toDataSourceSummaries(
  registry: DataSourceRegistry,
  schemaFilter?: string,
): readonly DataSourceSummary[] {
  return [...registry.entries()]
    .filter(([, src]) => (schemaFilter ? src.schema === schemaFilter : true))
    .map(([key, src]) => ({
      key,
      schema: src.schema,
      name: src.name,
      rowCount: src.rows.length,
    }));
}
