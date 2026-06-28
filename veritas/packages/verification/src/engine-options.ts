// EngineOptions: configuration knobs for the verification engine.

import type { Logger } from "@veritas/core";
import type { VerifierLLM } from "@veritas/llm";

/** Controls how the verification pipeline runs a single request. */
export interface EngineOptions {
  /** LLM provider used for claim extraction, research, and adjudication. */
  readonly llm: VerifierLLM;

  /** Structured logger for pipeline telemetry; defaults to noopLogger if omitted. */
  readonly logger?: Logger;

  /** Maximum claims processed concurrently during research + adjudication. */
  readonly concurrency?: number;

  /** Maximum number of claims extracted from free text (default 20). */
  readonly maxClaims?: number;

  /** Maximum search queries issued per claim during research (default 5). */
  readonly maxSearchQueries?: number;

  /** Verifier identity embedded in the provenance block (default "veritas"). */
  readonly verifier?: string;

  /** Verifier version embedded in the provenance block (default "1.0.0"). */
  readonly verifierVersion?: string;

  /**
   * Effort level label embedded in provenance; affects model selection hints.
   * "low" | "standard" | "high" (default "standard").
   */
  readonly effort?: "low" | "standard" | "high";

  /** Abort signal forwarded to every LLM call for cooperative cancellation. */
  readonly signal?: AbortSignal;
}
