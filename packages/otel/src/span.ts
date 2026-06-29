// Concrete mutable span implementation for OpenTelemetry-compatible tracing.

import { epochToIso } from "@veritas/core";
import type { IsoTimestamp } from "@veritas/core";
import type { Span, SpanAttributes, SpanEvent, SpanStatus } from "@veritas/observability";

/** Generates a random hex string of the given byte length. */
function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < bytes; i++) {
    arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Generates a 128-bit (16-byte) trace ID as a 32-char hex string. */
export function newTraceId(): string {
  return randomHex(16);
}

/** Generates a 64-bit (8-byte) span ID as a 16-char hex string. */
export function newSpanId(): string {
  return randomHex(8);
}

/** Mutable span that accumulates attributes, events, and status until ended. */
export class MutableSpan implements Span {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly name: string;
  readonly startTime: IsoTimestamp;

  private _attributes: SpanAttributes = {};
  private _events: SpanEvent[] = [];
  private _status: SpanStatus = "unset";
  private _statusMessage?: string;
  private _endTime?: IsoTimestamp;
  private _isEnded = false;

  constructor(
    name: string,
    traceId: string,
    spanId: string,
    parentSpanId?: string,
  ) {
    this.name = name;
    this.traceId = traceId;
    this.spanId = spanId;
    this.parentSpanId = parentSpanId;
    this.startTime = epochToIso(Date.now());
  }

  get attributes(): Readonly<SpanAttributes> {
    return this._attributes;
  }

  get events(): readonly SpanEvent[] {
    return this._events;
  }

  get status(): SpanStatus {
    return this._status;
  }

  get statusMessage(): string | undefined {
    return this._statusMessage;
  }

  get endTime(): IsoTimestamp | undefined {
    return this._endTime;
  }

  get isEnded(): boolean {
    return this._isEnded;
  }

  setAttribute(key: string, value: string | number | boolean): this {
    if (this._isEnded) return this;
    this._attributes = { ...this._attributes, [key]: value };
    return this;
  }

  setAttributes(attrs: SpanAttributes): this {
    if (this._isEnded) return this;
    this._attributes = { ...this._attributes, ...attrs };
    return this;
  }

  addEvent(name: string, attributes?: SpanAttributes): this {
    if (this._isEnded) return this;
    const event: SpanEvent = {
      name,
      timestamp: epochToIso(Date.now()),
      ...(attributes !== undefined ? { attributes } : {}),
    };
    this._events = [...this._events, event];
    return this;
  }

  setStatus(status: SpanStatus, message?: string): this {
    if (this._isEnded) return this;
    this._status = status;
    this._statusMessage = message;
    return this;
  }

  recordError(error: Error): this {
    this.addEvent("exception", {
      "exception.type": error.name,
      "exception.message": error.message,
      ...(error.stack !== undefined ? { "exception.stacktrace": error.stack } : {}),
    });
    return this.setStatus("error", error.message);
  }

  end(): void {
    if (this._isEnded) return;
    this._endTime = epochToIso(Date.now());
    this._isEnded = true;
  }

  /** Returns an immutable snapshot suitable for export. */
  toSnapshot(): Readonly<MutableSpan> {
    return this;
  }
}
