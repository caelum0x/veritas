// OTel tracer that creates MutableSpans and exports completed spans via a port.

import type { Tracer, Span, StartSpanOptions } from "@veritas/observability";
import { MutableSpan, newTraceId, newSpanId } from "./span.js";
import type { SpanExporter } from "./exporter.js";
import type { Sampler } from "./sampler.js";

/** Options for constructing an OtelTracer. */
export interface OtelTracerOptions {
  readonly name: string;
  readonly exporter: SpanExporter;
  readonly sampler: Sampler;
}

/** OTel-compatible tracer that samples and exports finished spans. */
export class OtelTracer implements Tracer {
  private readonly name: string;
  private readonly exporter: SpanExporter;
  private readonly sampler: Sampler;

  constructor(options: OtelTracerOptions) {
    this.name = options.name;
    this.exporter = options.exporter;
    this.sampler = options.sampler;
  }

  startSpan(name: string, options?: StartSpanOptions): Span {
    const traceId = options?.traceId ?? options?.parentSpan?.traceId ?? newTraceId();
    const spanId = newSpanId();
    const parentSpanId =
      options?.parentSpanId ?? options?.parentSpan?.spanId;

    const span = new MutableSpan(name, traceId, spanId, parentSpanId);

    if (options?.attributes !== undefined) {
      span.setAttributes(options.attributes);
    }

    span.setAttribute("otel.scope.name", this.name);
    return span;
  }

  withSpan<T>(name: string, fn: (span: Span) => T, options?: StartSpanOptions): T {
    const span = this.startSpan(name, options);
    try {
      const result = fn(span);
      span.setStatus("ok");
      return result;
    } catch (err: unknown) {
      if (err instanceof Error) {
        span.recordError(err);
      } else {
        span.setStatus("error", String(err));
      }
      throw err;
    } finally {
      span.end();
      this.maybeExport(span);
    }
  }

  async withSpanAsync<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    options?: StartSpanOptions,
  ): Promise<T> {
    const span = this.startSpan(name, options);
    try {
      const result = await fn(span);
      span.setStatus("ok");
      return result;
    } catch (err: unknown) {
      if (err instanceof Error) {
        span.recordError(err);
      } else {
        span.setStatus("error", String(err));
      }
      throw err;
    } finally {
      span.end();
      this.maybeExport(span);
    }
  }

  private maybeExport(span: Span): void {
    if (this.sampler.shouldSample(span.name) === "record_and_sample") {
      void this.exporter.export([span]);
    }
  }
}
