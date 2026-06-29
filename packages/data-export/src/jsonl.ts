// JSONL export: serializes warehouse rows to newline-delimited JSON bytes.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { RowRecord } from "@veritas/warehouse";
import type { ExportResult } from "./types.js";
import { ExportFormatError } from "./errors.js";

/** Converts an array of row records to JSONL format (one JSON object per line). */
export function toJsonl(rows: readonly RowRecord[]): Result<ExportResult> {
  try {
    const lines = rows.map((row) => JSON.stringify(row));
    const jsonl = lines.join("\n");
    const data = new TextEncoder().encode(jsonl);

    return ok({ format: "jsonl", data, rowCount: rows.length, byteSize: data.byteLength });
  } catch (cause) {
    return err(new ExportFormatError("Failed to serialize rows to JSONL", { cause }));
  }
}
