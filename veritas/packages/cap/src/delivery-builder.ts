// Build a VeritasDeliverable (CAP Schema payload) from a VerificationReport.

import { ok, err, contentHash, epochToIso, systemClock } from "@veritas/core";
import type { Result, AppError, IsoTimestamp } from "@veritas/core";
import { InternalError } from "@veritas/core";
import type { VerificationReport } from "@veritas/contracts";
import type { VeritasDeliverable } from "./types.js";

/** Options controlling delivery envelope construction. */
export interface DeliveryBuildOptions {
  /** Wall-clock duration of the verification run in milliseconds. */
  readonly durationMs: number;
}

/** Structured deliverable ready to be sent back over the CAP channel. */
export interface BuiltDelivery {
  readonly deliverable: VeritasDeliverable;
  /** SHA-256 content hash of the serialised report (hex). */
  readonly contentHashHex: string;
  readonly generatedAt: IsoTimestamp;
}

/**
 * Assemble a VeritasDeliverable envelope from a completed VerificationReport.
 * Returns an InternalError if the report cannot be serialised for hashing.
 */
export function buildDelivery(
  report: VerificationReport,
  options: DeliveryBuildOptions,
): Result<BuiltDelivery, AppError> {
  let serialised: string;
  try {
    serialised = JSON.stringify(report);
  } catch (e: unknown) {
    return err(
      new InternalError({
        message: e instanceof Error ? e.message : "Failed to serialise verification report",
      }) as AppError,
    );
  }

  const hashHex = contentHash(serialised);
  const generatedAt = epochToIso(systemClock.now());

  const deliverable: VeritasDeliverable = {
    schema: "veritas/verification-report@1",
    report,
    generatedAt,
    durationMs: options.durationMs,
  };

  return ok({
    deliverable,
    contentHashHex: hashHex,
    generatedAt,
  });
}

/**
 * Produce a compact summary string from a VeritasDeliverable for logging.
 */
export function summariseDelivery(delivery: BuiltDelivery): string {
  const { report, durationMs } = delivery.deliverable;
  return (
    `veritas.report.v1 | trustScore=${report.trustScore} ` +
    `claims=${report.claims.length} ` +
    `[S:${report.counts.supported} R:${report.counts.refuted} U:${report.counts.unverifiable}] ` +
    `duration=${durationMs}ms hash=${delivery.contentHashHex.slice(0, 12)}…`
  );
}
