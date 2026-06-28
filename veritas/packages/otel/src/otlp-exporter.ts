// OTLP exporter port — sends spans via HTTP/JSON to an OTLP-compatible endpoint.

import type { Span, SpanAttributes } from "@veritas/observability";
import type { SpanExporter, ExportResult } from "./exporter.js";
import { ok, err } from "@veritas/core";

/** Configuration for the OTLP HTTP exporter. */
export interface OtlpExporterConfig {
  /** Base URL of the OTLP collector, e.g. http://localhost:4318 */
  readonly endpoint: string;
  /** Optional additional headers (e.g. auth tokens). */
  readonly headers?: Record<string, string>;
  /** Timeout in milliseconds (default: 5000). */
  readonly timeoutMs?: number;
}

/** Wire format for a single OTLP span attribute value. */
type OtlpAnyValue =
  | { stringValue: string }
  | { intValue: number }
  | { doubleValue: number }
  | { boolValue: boolean };

interface OtlpKeyValue {
  readonly key: string;
  readonly value: OtlpAnyValue;
}

interface OtlpSpanEvent {
  readonly name: string;
  readonly timeUnixNano: string;
  readonly attributes?: readonly OtlpKeyValue[];
}

interface OtlpSpan {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly name: string;
  readonly kind: number;
  readonly startTimeUnixNano: string;
  readonly endTimeUnixNano: string;
  readonly attributes: readonly OtlpKeyValue[];
  readonly events: readonly OtlpSpanEvent[];
  readonly status: { readonly code: number; readonly message?: string };
}

function toNano(iso: string): string {
  return String(BigInt(new Date(iso).getTime()) * 1_000_000n);
}

function toOtlpValue(v: string | number | boolean): OtlpAnyValue {
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { boolValue: v };
  if (Number.isInteger(v)) return { intValue: v };
  return { doubleValue: v };
}

function toOtlpAttrs(attrs: SpanAttributes): OtlpKeyValue[] {
  return Object.entries(attrs).map(([key, value]) => ({
    key,
    value: toOtlpValue(value),
  }));
}

function spanToOtlp(span: Span): OtlpSpan {
  const statusCode =
    span.status === "ok" ? 1 : span.status === "error" ? 2 : 0;
  return {
    traceId: span.traceId,
    spanId: span.spanId,
    ...(span.parentSpanId !== undefined
      ? { parentSpanId: span.parentSpanId }
      : {}),
    name: span.name,
    kind: 1, // SPAN_KIND_INTERNAL
    startTimeUnixNano: toNano(span.startTime),
    endTimeUnixNano: span.endTime ? toNano(span.endTime) : toNano(new Date().toISOString()),
    attributes: toOtlpAttrs(span.attributes),
    events: span.events.map((e) => ({
      name: e.name,
      timeUnixNano: toNano(e.timestamp),
      ...(e.attributes ? { attributes: toOtlpAttrs(e.attributes) } : {}),
    })),
    status: {
      code: statusCode,
      ...(span.statusMessage ? { message: span.statusMessage } : {}),
    },
  };
}

/** OTLP/HTTP JSON exporter that sends spans to an OpenTelemetry collector. */
export class OtlpExporter implements SpanExporter {
  private readonly endpoint: string;
  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;

  constructor(config: OtlpExporterConfig) {
    this.endpoint = config.endpoint.replace(/\/$/, "") + "/v1/traces";
    this.headers = {
      "Content-Type": "application/json",
      ...config.headers,
    };
    this.timeoutMs = config.timeoutMs ?? 5000;
  }

  async export(spans: readonly Span[]): Promise<ExportResult> {
    if (spans.length === 0) return ok(undefined);

    const body = JSON.stringify({
      resourceSpans: [
        {
          resource: { attributes: [] },
          scopeSpans: [
            {
              scope: { name: "@veritas/otel" },
              spans: spans.map(spanToOtlp),
            },
          ],
        },
      ],
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: this.headers,
        body,
        signal: controller.signal,
      });
      if (!response.ok) {
        return err(
          new Error(`OTLP export failed: HTTP ${response.status}`)
        );
      }
      return ok(undefined);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "OTLP export error";
      return err(new Error(message));
    } finally {
      clearTimeout(timer);
    }
  }

  async shutdown(): Promise<void> {
    // No persistent connections to close.
  }
}
