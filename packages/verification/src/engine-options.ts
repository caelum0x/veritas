// EngineOptions: configuration knobs for the verification engine.

import type { Logger } from "@veritas/core";
import type { VerifierLLM } from "@veritas/llm";

/** Outcome of running an input guard over raw request text. */
export interface GuardDecision {
  /** Whether the input is permitted to proceed through the pipeline. */
  readonly allowed: boolean;
  /** Human-readable reason when the input is blocked. */
  readonly reason?: string;
}

/**
 * Vendor-agnostic seam for input gating.
 *
 * The engine knows nothing about how guarding is implemented — the composition
 * root (e.g. `@veritas/container`) adapts a concrete guardrail pipeline to this
 * interface. Mirrors the `VerifierLLM` seam philosophy.
 */
export interface InputGuard {
  /** Inspect raw input text and decide whether the run may proceed. */
  check(content: string): Promise<GuardDecision>;
}

/**
 * Vendor-agnostic seam for confidence calibration.
 *
 * Maps a raw model confidence in [0, 1] to a calibrated probability. The engine
 * stays decoupled from any particular calibration strategy (Platt, isotonic, …).
 */
export interface ConfidenceCalibrator {
  /** Transform a raw confidence into a calibrated one; both in [0, 1]. */
  calibrate(rawConfidence: number): number;
}

/** Structural shape of a report citation (matches PipelineCitation). */
export interface CitationLike {
  readonly url: string;
  readonly title: string | null;
  readonly quote: string | null;
  readonly supports: boolean;
}

/**
 * Vendor-agnostic seam for citation post-processing (deduplication, etc.).
 *
 * Applied per claim after adjudication. The engine stays decoupled from the
 * concrete citation toolkit; the composition root adapts one to this interface.
 */
export interface CitationRefiner {
  /** Return a refined (e.g. deduplicated) view of the given citations. */
  dedupe(citations: ReadonlyArray<CitationLike>): ReadonlyArray<CitationLike>;
}

/** A verdict produced by a domain-specific verifier for a single claim. */
export interface DomainVerdict {
  /** Identifier of the specialized verifier that handled the claim. */
  readonly verifierId: string;
  /** Domain verdict for the claim. */
  readonly verdict: "SUPPORTED" | "REFUTED" | "UNVERIFIABLE";
  /** Confidence in the domain verdict, [0, 1]. */
  readonly confidence: number;
  /** Short human-readable rationale. */
  readonly rationale: string;
}

/**
 * Vendor-agnostic seam for domain-specific verification. The composition root
 * adapts a registry of specialized verifiers (medical, scientific, financial, …)
 * to this interface; the engine consults it per claim without knowing the
 * domains or data sources involved.
 */
export interface DomainVerifierRouter {
  /** Run the matching domain verifier for a claim, or null when none applies. */
  verify(claimText: string): Promise<DomainVerdict | null>;
}

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

  /**
   * Optional input guard run before any processing. When present and it blocks
   * the input, the run is rejected with a ValidationError before the LLM is hit
   * — "validate before lock" applied at the engine boundary.
   */
  readonly inputGuard?: InputGuard;

  /**
   * Optional confidence calibrator applied to every adjudicated claim's
   * confidence before scoring. When absent, raw confidences are used unchanged.
   */
  readonly calibrator?: ConfidenceCalibrator;

  /**
   * Optional citation refiner applied to every adjudicated claim's citations
   * after adjudication. When absent, citations are passed through unchanged.
   */
  readonly citationRefiner?: CitationRefiner;

  /**
   * Optional domain-verifier router. When present, each claim is additionally
   * checked by a matching specialized verifier and the result is folded into
   * the claim's reasoning. When absent, no domain verification is performed.
   */
  readonly domainRouter?: DomainVerifierRouter;
}
