// Fallback verifier: used when no specialist verifier is available for a claim.
import { ok, err, type Result, Verdict } from "@veritas/core";
import {
  makeVerdictSignal,
  makeEvidenceBundle,
  type VerifierOutput,
  type SpecializedVerifiableClaim,
  type VerifierContext,
} from "@veritas/verifier-kit";
import { FallbackError } from "./errors.js";

/** Produce a minimal VerifierOutput for claims with no specialist coverage. */
export async function runFallback(
  claim: SpecializedVerifiableClaim,
  _ctx: VerifierContext,
): Promise<Result<VerifierOutput>> {
  try {
    const signal = makeVerdictSignal({
      verifierId: "fallback-general",
      verdict: Verdict.UNVERIFIABLE,
      confidence: 0.2,
      rationale:
        "No specialized verifier could handle this claim; a general check returned insufficient evidence.",
      sources: [],
      weight: 0.3,
    });

    const evidence = makeEvidenceBundle(
      "fallback-general",
      claim.text,
      [],
      new Date().toISOString(),
    );

    return ok({
      verifierId: "fallback-general",
      evidence,
      signals: [signal],
    } satisfies VerifierOutput);
  } catch (e) {
    return err(new FallbackError(claim.id, e instanceof Error ? e.message : String(e)));
  }
}
