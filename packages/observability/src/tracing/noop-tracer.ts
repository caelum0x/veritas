// No-op tracer implementation that satisfies the Tracer interface without side effects.
import { epochToIso } from "@veritas/core";
import type { Span, Tracer, StartSpanOptions, SpanAttributes, SpanEvent, SpanStatus } from "./span.js";

/** A no-op span that records nothing and is always a no-op. */
class NoopSpan implements Span {
  readonly traceId: string = "00000000000000000000000000000000";
  readonly spanId: string = "0000000000000000";
  readonly name: string;
  readonly startTime: import("@veritas/core").IsoTimestamp;
  readonly attributes: Readonly<SpanAttributes> = {};
  readonly events: readonly SpanEvent[] = [];
  readonly status: SpanStatus = "unset";
  readonly isEnded: boolean = false;

  constructor(name: string) {
    this.name = name;
    this.startTime = epochToIso(Date.now());
  }

  setAttribute(_key: string, _value: string | number | boolean): this {
    return this;
  }

  setAttributes(_attrs: Record<string, string | number | boolean>): this {
    return this;
  }

  addEvent(_name: string, _attrs?: Record<string, string | number | boolean>): this {
    return this;
  }

  setStatus(_status: SpanStatus, _message?: string): this {
    return this;
  }

  recordError(_error: Error): this {
    return this;
  }

  end(): void {
    // no-op
  }
}

/** A no-op tracer that creates NoopSpan instances and never exports data. */
export class NoopTracer implements Tracer {
  readonly name: string;

  constructor(name = "noop") {
    this.name = name;
  }

  startSpan(name: string, _options?: StartSpanOptions): Span {
    return new NoopSpan(name);
  }

  withSpan<T>(name: string, fn: (span: Span) => T, _options?: StartSpanOptions): T {
    const span = new NoopSpan(name);
    try {
      return fn(span);
    } finally {
      span.end();
    }
  }

  withSpanAsync<T>(name: string, fn: (span: Span) => Promise<T>, _options?: StartSpanOptions): Promise<T> {
    const span = new NoopSpan(name);
    return fn(span).finally(() => {
      span.end();
    });
  }
}

/** Singleton no-op tracer instance. */
export const noopTracer: Tracer = new NoopTracer();
