// CSV exporter — flattens tabular data to comma-separated values
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Exporter } from "./exporter.js";
import type { ExportFormat } from "./format.js";
import type { ExportOptions, ExportResult } from "./types.js";

function escapeCell(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function flattenRow(obj: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  return Object.entries(obj).reduce<Record<string, unknown>>((acc, [key, val]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      Object.assign(acc, flattenRow(val as Record<string, unknown>, fullKey));
    } else {
      acc[fullKey] = Array.isArray(val) ? JSON.stringify(val) : val;
    }
    return acc;
  }, {});
}

function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const headerLine = headers.map(escapeCell).join(",");
  const dataLines = rows.map((row) => headers.map((h) => escapeCell(row[h])).join(","));
  return [headerLine, ...dataLines].join("\r\n");
}

export class CsvExporter implements Exporter {
  readonly format: ExportFormat = "csv";

  async export(data: unknown, options: ExportOptions): Promise<Result<ExportResult>> {
    try {
      const records = Array.isArray(data) ? data : [data];
      const flatRows = records.map((r) =>
        typeof r === "object" && r !== null
          ? flattenRow(r as Record<string, unknown>)
          : { value: r }
      );
      const content = rowsToCsv(flatRows);
      const bytes = Buffer.from(content, "utf-8");
      return ok({
        format: this.format,
        mimeType: "text/csv",
        filename: options.filename ?? "export.csv",
        content: bytes,
        byteSize: bytes.byteLength,
        exportedAt: new Date().toISOString(),
      });
    } catch (e) {
      return err(e);
    }
  }
}
