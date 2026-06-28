// Parses a raw delivery payload into a typed VerificationReport.
import { safeParseJson } from "@veritas/core";
import { VerificationReportSchema } from "@veritas/contracts";
import { ReportParseError } from "../errors.js";
import type { Delivery, VerificationReport } from "../types.js";

/**
 * Extracts and validates a VerificationReport from a Delivery's payload.
 *
 * The delivery payload may be:
 *   - A pre-parsed object (when the API already deserialised it)
 *   - A JSON string that needs to be parsed first
 *   - null / undefined (delivery has no content yet)
 *
 * Throws ReportParseError if the payload is present but invalid.
 * Returns null if the delivery carries no payload.
 */
export function readReport(delivery: Delivery): VerificationReport | null {
  const raw: unknown = delivery.report;

  if (raw === null || raw === undefined) {
    return null;
  }

  // If the payload arrived as a string, try to JSON-parse it first.
  let candidate: unknown = raw;
  if (typeof raw === "string") {
    const parsed = safeParseJson(raw);
    if (parsed === undefined) {
      throw new ReportParseError(
        "Delivery payload is a string but not valid JSON",
        raw
      );
    }
    candidate = parsed;
  }

  const result = VerificationReportSchema.safeParse(candidate);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new ReportParseError(
      `Delivery payload does not match VerificationReportSchema: ${issues}`,
      candidate
    );
  }

  return result.data;
}

/**
 * Like readReport but returns null instead of throwing when the report
 * is present but fails validation — useful for lenient display contexts.
 */
export function tryReadReport(delivery: Delivery): VerificationReport | null {
  try {
    return readReport(delivery);
  } catch {
    return null;
  }
}
