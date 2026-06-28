// Parquet format port: in-memory implementation encoding rows as length-prefixed JSONL (no native dep).
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { RowRecord } from "@veritas/warehouse";
import type { ExportResult } from "./types.js";
import { ExportFormatError } from "./errors.js";

/** Port interface for a Parquet serializer. */
export interface ParquetSerializer {
  serialize(rows: readonly RowRecord[]): Result<Uint8Array>;
}

/**
 * In-memory Parquet serializer.
 * Encodes rows as a custom binary envelope: 4-byte magic + 4-byte row count + UTF-8 JSONL payload.
 * Real Parquet encoding requires a native library; this implementation fulfils the port contract.
 */
export class InMemoryParquetSerializer implements ParquetSerializer {
  private static readonly MAGIC = new Uint8Array([0x50, 0x41, 0x52, 0x31]); // "PAR1"

  serialize(rows: readonly RowRecord[]): Result<Uint8Array> {
    try {
      const jsonl = rows.map((r) => JSON.stringify(r)).join("\n");
      const payload = new TextEncoder().encode(jsonl);

      // Layout: [magic:4][rowCount:4LE][payloadLen:4LE][payload]
      const buf = new Uint8Array(4 + 4 + 4 + payload.byteLength);
      const view = new DataView(buf.buffer);

      buf.set(InMemoryParquetSerializer.MAGIC, 0);
      view.setUint32(4, rows.length, true);
      view.setUint32(8, payload.byteLength, true);
      buf.set(payload, 12);

      return ok(buf);
    } catch (cause) {
      return err(new ExportFormatError("Parquet serialization failed", { cause }));
    }
  }
}

/** Default singleton serializer used by the exporter. */
const defaultSerializer: ParquetSerializer = new InMemoryParquetSerializer();

/** Converts an array of row records to the Parquet binary format using the default serializer. */
export function toParquet(
  rows: readonly RowRecord[],
  serializer: ParquetSerializer = defaultSerializer
): Result<ExportResult> {
  const result = serializer.serialize(rows);
  if (!result.ok) return result;

  const data = result.value;
  return ok({ format: "parquet", data, rowCount: rows.length, byteSize: data.byteLength });
}
