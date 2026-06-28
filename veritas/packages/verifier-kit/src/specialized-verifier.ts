// SpecializedVerifier interface: contract every domain verifier must implement.

import type { Result } from "@veritas/core";
import type { VerifierContext } from "./context.js";
import type { EvidenceBundle } from "./evidence.js";
import type { VerdictSignal } from "./signal.js";

/**
 * A domain claim submitted to a specialized verifier.
 * Text is the raw assertion; domain is an optional hint used for routing.
 */
export interface VerifiableClaim {
  readonly id: string;
  readonly text: string;
  /** Caller-supplied domain hint (e.g. "financial", "medical", "scientific"). */
  readonly domain?: string;
  /** Arbitrary key-value context carried by the caller. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** Full output of a specialized verifier: evidence plus derived signals. */
export interface VerifierOutput {
  readonly verifierId: string;
  readonly evidence: EvidenceBundle;
  readonly signals: ReadonlyArray<VerdictSignal>;
}

/**
 * Contract every domain-specific verifier must satisfy.
 * Implementations are stateless: all mutable state lives in ports/context.
 */
export interface SpecializedVerifier {
  /** Stable identifier for this verifier (e.g. "edgar-financial"). */
  readonly id: string;
  /** Human-readable name surfaced in reports. */
  readonly displayName: string;
  /** Domain(s) this verifier handles (e.g. ["financial", "sec"]). */
  readonly domains: ReadonlyArray<string>;

  /**
   * Returns true if this verifier can meaningfully check the claim.
   * Cheap synchronous gate — must not perform network calls.
   */
  canHandle(claim: VerifiableClaim): boolean;

  /**
   * Perform domain-specific evidence gathering and return verdict signals.
   * Must be pure w.r.t. the claim — no mutation of shared state.
   */
  verify(claim: VerifiableClaim, ctx: VerifierContext): Promise<Result<VerifierOutput>>;
}
