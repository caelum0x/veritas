// Declared capability types a plugin may advertise in its manifest.

import { z } from "zod";

/** Core capability identifiers that the host understands. */
export const CapabilityKind = {
  /** Plugin fetches and indexes web-accessible sources. */
  WEB_SEARCH: "web_search",
  /** Plugin calls external LLM APIs for adjudication. */
  LLM_INFERENCE: "llm_inference",
  /** Plugin reads/writes to a database or cache store. */
  STORAGE_ACCESS: "storage_access",
  /** Plugin performs OCR or document parsing. */
  DOCUMENT_PARSE: "document_parse",
  /** Plugin writes provenance records on-chain. */
  BLOCKCHAIN_WRITE: "blockchain_write",
  /** Plugin reads public on-chain state. */
  BLOCKCHAIN_READ: "blockchain_read",
  /** Plugin calls arbitrary external HTTP endpoints. */
  HTTP_EGRESS: "http_egress",
  /** Plugin emits domain events into the platform bus. */
  EVENT_EMIT: "event_emit",
} as const;

export type CapabilityKind = (typeof CapabilityKind)[keyof typeof CapabilityKind];

/** Zod schema for a single capability declaration. */
export const capabilitySchema = z.object({
  kind: z.enum([
    "web_search",
    "llm_inference",
    "storage_access",
    "document_parse",
    "blockchain_write",
    "blockchain_read",
    "http_egress",
    "event_emit",
  ]),
  /** Human-readable reason the plugin needs this capability. */
  reason: z.string().min(1),
  /** Whether the host must grant this capability for the plugin to function. */
  required: z.boolean().default(true),
});

export type Capability = z.infer<typeof capabilitySchema>;

/** Convenience constructor for a required capability declaration. */
export function requiredCapability(kind: CapabilityKind, reason: string): Capability {
  return { kind, reason, required: true };
}

/** Convenience constructor for an optional capability declaration. */
export function optionalCapability(kind: CapabilityKind, reason: string): Capability {
  return { kind, reason, required: false };
}

/** Return only capabilities that the host must grant for the plugin to load. */
export function requiredCapabilities(caps: ReadonlyArray<Capability>): ReadonlyArray<Capability> {
  return caps.filter((c) => c.required);
}

/** Return true if all required capabilities are present in the granted set. */
export function allRequiredGranted(
  declared: ReadonlyArray<Capability>,
  granted: ReadonlySet<CapabilityKind>,
): boolean {
  return requiredCapabilities(declared).every((c) => granted.has(c.kind));
}
