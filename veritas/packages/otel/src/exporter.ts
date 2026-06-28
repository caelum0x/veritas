// Port interface for span exporters plus an in-memory implementation for testing.

import type { Span } from "@veritas/observability";
import type { Result } from "@veritas/core";
import { ok } from "@veritas/core";

/** Result type returned by a span export call. */
export type ExportResult = Result<void>;

/** Port interface: any sink that can receive completed spans. */
export interface SpanExporter {
  /** Export a batch of finished spans. */
  export(spans: readonly Span[]): Promise<ExportResult>;
  /** Flush any buffered spans and release resources. */
  shutdown(): Promise<void>;
}

/** In-memory exporter that accumulates spans for inspection in tests. */
export class InMemorySpanExporter implements SpanExporter {
  private _spans: Span[] = [];
  private _isShutdown = false;

  /** All spans received since creation or last reset. */
  get spans(): readonly Span[] {
    return this._spans;
  }

  async export(spans: readonly Span[]): Promise<ExportResult> {
    if (this._isShutdown) return ok(undefined);
    this._spans = [...this._spans, ...spans];
    return ok(undefined);
  }

  async shutdown(): Promise<void> {
    this._isShutdown = true;
  }

  /** Reset the accumulated spans (useful between test cases). */
  reset(): void {
    this._spans = [];
  }
}

/** Composite exporter that fans out to multiple exporters in parallel. */
export class CompositeSpanExporter implements SpanExporter {
  private readonly exporters: readonly SpanExporter[];

  constructor(exporters: readonly SpanExporter[]) {
    this.exporters = exporters;
  }

  async export(spans: readonly Span[]): Promise<ExportResult> {
    await Promise.all(this.exporters.map((e) => e.export(spans)));
    return ok(undefined);
  }

  async shutdown(): Promise<void> {
    await Promise.all(this.exporters.map((e) => e.shutdown()));
  }
}
