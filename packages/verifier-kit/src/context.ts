// VerifierContext: bundles the LLM provider and data-source registry for verifier use.

import type { VerifierLLM } from "@veritas/llm";
import type { Clock } from "@veritas/core";
import type { DataSourcePort } from "./source-port.js";

/** Runtime context injected into every specialized verifier. */
export interface VerifierContext {
  /** LLM provider for AI-assisted research and adjudication. */
  readonly llm: VerifierLLM;
  /** Named map of external data-source adapters (e.g. "edgar", "pubmed"). */
  readonly sources: ReadonlyMap<string, DataSourcePort>;
  /** Wall-clock abstraction (enables deterministic testing). */
  readonly clock: Clock;
  /** Optional request-scoped trace id for observability. */
  readonly traceId?: string;
}

/** Retrieve a typed source port by name, throwing if absent. */
export function requireSource(ctx: VerifierContext, name: string): DataSourcePort {
  const port = ctx.sources.get(name);
  if (port == null) {
    throw new Error(`[verifier-kit] DataSourcePort "${name}" is not registered in VerifierContext`);
  }
  return port;
}

/** Build a VerifierContext from its parts (pure factory). */
export function makeVerifierContext(
  llm: VerifierLLM,
  sources: ReadonlyMap<string, DataSourcePort>,
  clock: Clock,
  traceId?: string,
): VerifierContext {
  return Object.freeze({ llm, sources, clock, traceId });
}
