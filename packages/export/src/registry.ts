// Exporter registry — maps ExportFormat values to Exporter implementations
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { Exporter } from "./exporter.js";
import type { ExportFormat } from "./format.js";
import type { ExportOptions, ExportResult } from "./types.js";
import { ExporterNotFoundError, UnsupportedFormatError } from "./errors.js";

export class ExporterRegistry {
  private readonly exporters: ReadonlyMap<ExportFormat, Exporter>;

  constructor(exporters: ReadonlyMap<ExportFormat, Exporter> = new Map()) {
    this.exporters = exporters;
  }

  register(exporter: Exporter): ExporterRegistry {
    const updated = new Map(this.exporters);
    updated.set(exporter.format, exporter);
    return new ExporterRegistry(updated);
  }

  unregister(format: ExportFormat): ExporterRegistry {
    const updated = new Map(this.exporters);
    updated.delete(format);
    return new ExporterRegistry(updated);
  }

  get(format: ExportFormat): Result<Exporter, ExporterNotFoundError> {
    const exporter = this.exporters.get(format);
    if (exporter === undefined) {
      return err(new ExporterNotFoundError(format));
    }
    return ok(exporter);
  }

  has(format: ExportFormat): boolean {
    return this.exporters.has(format);
  }

  formats(): ReadonlyArray<ExportFormat> {
    return Array.from(this.exporters.keys());
  }

  async export(
    format: ExportFormat,
    data: unknown,
    options: ExportOptions,
  ): Promise<Result<ExportResult, ExporterNotFoundError | UnsupportedFormatError>> {
    const exporterResult = this.get(format);
    if (exporterResult.ok === false) {
      return err(exporterResult.error);
    }
    return exporterResult.value.export(data, options) as Promise<
      Result<ExportResult, ExporterNotFoundError | UnsupportedFormatError>
    >;
  }
}

export const createExporterRegistry = (
  exporters: ReadonlyArray<Exporter> = [],
): ExporterRegistry => {
  const map = new Map<ExportFormat, Exporter>(
    exporters.map((e) => [e.format, e]),
  );
  return new ExporterRegistry(map);
};
