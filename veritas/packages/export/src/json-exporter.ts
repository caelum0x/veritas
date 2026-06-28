// JSON exporter — serializes export data to formatted JSON
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Exporter } from "./exporter.js";
import type { ExportFormat } from "./format.js";
import type { ExportOptions, ExportResult } from "./types.js";

export class JsonExporter implements Exporter {
  readonly format: ExportFormat = "json";

  async export(data: unknown, options: ExportOptions): Promise<Result<ExportResult>> {
    try {
      const indent = options.pretty !== false ? 2 : 0;
      const content = JSON.stringify(data, null, indent);
      const bytes = Buffer.from(content, "utf-8");
      return ok({
        format: this.format,
        mimeType: "application/json",
        filename: options.filename ?? `export.json`,
        content: bytes,
        byteSize: bytes.byteLength,
        exportedAt: new Date().toISOString(),
      });
    } catch (e) {
      return err(e);
    }
  }
}
