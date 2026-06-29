// mapping: transforms raw DomainEvent data into a normalised OutboundPayload.
import { newId } from "@veritas/core";
import type { DomainEvent } from "@veritas/core";
import type { OutboundPayload } from "./payload.js";

export type SeverityResolver = (event: DomainEvent) => "info" | "warning" | "error";
export type SummaryResolver = (event: DomainEvent) => string;
export type BodyResolver = (event: DomainEvent) => string | undefined;
export type SourceUrlResolver = (event: DomainEvent) => string | undefined;

export interface MappingOptions {
  readonly resolveSeverity?: SeverityResolver;
  readonly resolveSummary?: SummaryResolver;
  readonly resolveBody?: BodyResolver;
  readonly resolveSourceUrl?: SourceUrlResolver;
  readonly baseUrl?: string;
}

const defaultSummary: SummaryResolver = (e) =>
  `[${e.type}] event ${e.id}`;

const defaultSeverity: SeverityResolver = (e) => {
  const t = e.type.toLowerCase();
  if (t.includes("error") || t.includes("failed") || t.includes("rejected")) return "error";
  if (t.includes("warn") || t.includes("flagged") || t.includes("disputed")) return "warning";
  return "info";
};

function pickFields(
  event: DomainEvent,
): Record<string, string | number | boolean> {
  const raw = event.payload as Record<string, unknown>;
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
    }
  }
  out["eventId"] = event.id;
  return out;
}

export function mapEventToPayload(
  event: DomainEvent,
  opts: MappingOptions = {},
): OutboundPayload {
  const resolveSummary = opts.resolveSummary ?? defaultSummary;
  const resolveSeverity = opts.resolveSeverity ?? defaultSeverity;
  const resolveBody = opts.resolveBody;
  const resolveSourceUrl = opts.resolveSourceUrl;

  return {
    deliveryId: newId("delivery"),
    occurredAt: event.occurredAt,
    eventType: event.type,
    summary: resolveSummary(event),
    body: resolveBody ? resolveBody(event) : undefined,
    fields: pickFields(event),
    sourceUrl: resolveSourceUrl ? resolveSourceUrl(event) : undefined,
    severity: resolveSeverity(event),
  };
}
