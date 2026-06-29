// Warehouse exporter: reads rows from a warehouse table and delegates to a format serializer.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { QueryOptions, QueryResult, RowRecord } from "@veritas/warehouse";
import type { ExportFormat, ExportResult } from "./types.js";
import { toCsv } from "./csv.js";
import { toJsonl } from "./jsonl.js";
import { toParquet } from "./parquet.js";
import { ExportFormatError } from "./errors.js";

/** Minimal warehouse port used by the exporter. */
interface DataWarehouse {
  query(schema: string, name: string, options?: QueryOptions): Promise<Result<QueryResult>>;
}

export interface ExportRequest {
  readonly schema: string;
  readonly table: string;
  readonly format: ExportFormat;
  readonly queryOptions?: QueryOptions;
}

/** Orchestrates reading from the warehouse and serializing to the requested format. */
export async function exportTable(
  warehouse: DataWarehouse,
  request: ExportRequest
): Promise<Result<ExportResult>> {
  const queryResult = await warehouse.query(
    request.schema,
    request.table,
    request.queryOptions
  );

  if (!queryResult.ok) {
    return err(
      new ExportFormatError(
        `Failed to query warehouse table ${request.schema}.${request.table}`,
        { cause: queryResult.error }
      )
    );
  }

  const { rows } = queryResult.value;
  return serializeRows(rows, request.format);
}

/** Serializes an array of rows into the given format. */
export function serializeRows(
  rows: readonly RowRecord[],
  format: ExportFormat
): Result<ExportResult> {
  switch (format) {
    case "csv":
      return toCsv(rows);
    case "jsonl":
      return toJsonl(rows);
    case "parquet":
      return toParquet(rows);
    default:
      return err(new ExportFormatError(`Unsupported export format: ${format as string}`));
  }
}
