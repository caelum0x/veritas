// CSV export: serializes warehouse rows to RFC 4180 CSV bytes.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { RowRecord } from "@veritas/warehouse";
import type { ExportResult } from "./types.js";
import { ExportFormatError } from "./errors.js";

/** Escapes a cell value per RFC 4180: wrap in quotes if it contains commas, quotes, or newlines. */
function escapeCell(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Serializes a row record to a CSV line (without trailing newline). */
function rowToCsvLine(row: RowRecord, columns: readonly string[]): string {
  return columns.map((col) => escapeCell(row[col])).join(",");
}

/** Converts an array of row records to CSV format with a header row. */
export function toCsv(rows: readonly RowRecord[]): Result<ExportResult> {
  try {
    if (rows.length === 0) {
      const data = new TextEncoder().encode("");
      return ok({ format: "csv", data, rowCount: 0, byteSize: data.byteLength });
    }

    const columns = Object.keys(rows[0] as Record<string, unknown>);
    const header = columns.map(escapeCell).join(",");
    const lines = [header, ...rows.map((r) => rowToCsvLine(r, columns))];
    const csv = lines.join("\n");
    const data = new TextEncoder().encode(csv);

    return ok({ format: "csv", data, rowCount: rows.length, byteSize: data.byteLength });
  } catch (cause) {
    return err(new ExportFormatError("Failed to serialize rows to CSV", { cause }));
  }
}
