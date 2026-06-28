// Audit exporter port — defines the interface for exporting audit events to external systems.
import type { Result } from "@veritas/core";
import type { AuditEvent, ExportFormat, ExportFilter } from "./types.js";

/** Options controlling a single export run. */
export interface ExportOptions {
  readonly format: ExportFormat;
  readonly filter?: ExportFilter;
  /** Maximum number of events to include in a single export batch. */
  readonly limit?: number;
}

/** Summary of a completed export operation. */
export interface ExportResult {
  readonly eventsExported: number;
  readonly bytesWritten: number;
  readonly format: ExportFormat;
  readonly exportedAt: string;
}

/** Port interface for exporting audit events to various destinations and formats. */
export interface AuditExporter {
  /**
   * Export a batch of audit events using the given options.
   * Returns a Result so callers can handle transport or serialisation failures.
   */
  export(events: readonly AuditEvent[], options: ExportOptions): Promise<Result<ExportResult>>;
}

/** Export destination that writes to an in-memory buffer (useful for testing / preview). */
export class BufferExporter implements AuditExporter {
  private readonly _chunks: string[] = [];

  async export(
    events: readonly AuditEvent[],
    options: ExportOptions,
  ): Promise<Result<ExportResult>> {
    const { ok, err } = await import("@veritas/core");
    try {
      const { formatEvents } = await import("./stream.js");
      const serialised = await formatEvents(events, options.format, options.filter);
      this._chunks.push(serialised);
      return ok({
        eventsExported: events.length,
        bytesWritten: Buffer.byteLength(serialised, "utf8"),
        format: options.format,
        exportedAt: new Date().toISOString(),
      });
    } catch (e) {
      return err(e);
    }
  }

  /** Return all buffered output as a single string. */
  flush(): string {
    return this._chunks.join("");
  }

  /** Reset the buffer. */
  clear(): void {
    this._chunks.length = 0;
  }
}
