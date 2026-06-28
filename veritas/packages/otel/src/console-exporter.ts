// Console span exporter that pretty-prints finished spans via a Logger port.

import type { Span } from "@veritas/observability";
import type { Logger } from "@veritas/observability";
import { ok } from "@veritas/core";
import type { SpanExporter, ExportResult } from "./exporter.js";

/** Options for the ConsoleSpanExporter. */
export interface ConsoleSpanExporterOptions {
  readonly logger: Logger;
  /** Log level to use when emitting spans (default: "debug"). */
  readonly level?: "trace" | "debug" | "info";
}

/** Serialisable representation of a span for structured logging. */
interface SpanRecord {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly name: string;
  readonly status: string;
  readonly statusMessage?: string;
  readonly startTime: string;
  readonly endTime?: string;
  readonly durationMs?: number;
  readonly attributes: Record<string, string | number | boolean>;
  readonly events: ReadonlyArray<{
    name: string;
    timestamp: string;
    attributes?: Record<string, string | number | boolean>;
  }>;
}

function toRecord(span: Span): SpanRecord {
  const durationMs =
    span.endTime !== undefined
      ? Date.parse(span.endTime) - Date.parse(span.startTime)
      : undefined;

  return {
    traceId: span.traceId,
    spanId: span.spanId,
    ...(span.parentSpanId !== undefined ? { parentSpanId: span.parentSpanId } : {}),
    name: span.name,
    status: span.status,
    ...(span.statusMessage !== undefined ? { statusMessage: span.statusMessage } : {}),
    startTime: span.startTime,
    ...(span.endTime !== undefined ? { endTime: span.endTime } : {}),
    ...(durationMs !== undefined ? { durationMs } : {}),
    attributes: { ...span.attributes },
    events: span.events.map((e) => ({
      name: e.name,
      timestamp: e.timestamp,
      ...(e.attributes !== undefined ? { attributes: { ...e.attributes } } : {}),
    })),
  };
}

/** Exports completed spans by logging them as structured JSON via a Logger. */
export class ConsoleSpanExporter implements SpanExporter {
  private readonly logger: Logger;
  private readonly level: "trace" | "debug" | "info";
  private _isShutdown = false;

  constructor(options: ConsoleSpanExporterOptions) {
    this.logger = options.logger;
    this.level = options.level ?? "debug";
  }

  async export(spans: readonly Span[]): Promise<ExportResult> {
    if (this._isShutdown) return ok(undefined);

    for (const span of spans) {
      const record = toRecord(span);
      const fields: Record<string, unknown> = { span: record };

      if (this.level === "trace") {
        this.logger.trace("otel.span", fields);
      } else if (this.level === "info") {
        this.logger.info("otel.span", fields);
      } else {
        this.logger.debug("otel.span", fields);
      }
    }

    return ok(undefined);
  }

  async shutdown(): Promise<void> {
    this._isShutdown = true;
  }
}
