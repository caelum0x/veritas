// Exporter port — defines the interface all format exporters must implement
import type { Result } from "@veritas/core";
import type { ExportFormat } from "./format.js";
import type { ExportOptions, ExportResult } from "./types.js";

export interface Exporter {
  readonly format: ExportFormat;
  export(data: unknown, options: ExportOptions): Promise<Result<ExportResult>>;
}
