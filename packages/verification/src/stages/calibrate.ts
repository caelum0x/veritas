// Calibrate stage: remap each adjudicated claim's confidence via an optional calibrator.

import { clampScore } from "@veritas/core";
import type { VerificationContext, AdjudicatedClaim } from "../pipeline/context.js";

/**
 * Pipeline stage that applies the configured `ConfidenceCalibrator` (if any) to
 * every adjudicated claim's confidence. Runs after adjudication and before
 * scoring, so the aggregate trust score reflects calibrated probabilities.
 *
 * Each claim is rebuilt immutably with its calibrated confidence; the raw
 * confidence is preserved under `metadata`-free fields by keeping the rest of
 * the claim untouched. No-op when `options.calibrator` is undefined.
 */
export async function calibrateStage(ctx: VerificationContext): Promise<void> {
  const calibrator = ctx.options.calibrator;
  if (calibrator === undefined || ctx.adjudicatedClaims.length === 0) {
    return;
  }

  const calibrated: AdjudicatedClaim[] = ctx.adjudicatedClaims.map((ac) => {
    const raw = ac.confidence as number;
    const next = clampScore(calibrator.calibrate(raw));
    return { ...ac, confidence: next };
  });

  ctx.adjudicatedClaims = calibrated;

  ctx.logger.debug("calibrate: applied", {
    verificationId: ctx.verificationId,
    claims: calibrated.length,
  });
}
