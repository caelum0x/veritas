// Build and parse VerifiableCredentials that wrap a VerificationReport.
import type { Result, IsoTimestamp, Clock } from "@veritas/core";
import { ok, err, systemClock, epochToIso, clampScore } from "@veritas/core";
import type { Report } from "@veritas/contracts";
import type { Did } from "@veritas/did";
import type {
  VerificationVerifiableCredential,
  VerificationCredentialSubject,
  VcStatus,
} from "./types.js";
import { newVcId } from "./types.js";
import type { CredentialError } from "./errors.js";
import { InvalidCredentialSubjectError } from "./errors.js";
import { VerificationCredentialSubjectSchema } from "./types.js";

/** W3C and Veritas context URIs for verification credentials. */
export const VERIFICATION_VC_CONTEXTS = [
  "https://www.w3.org/2018/credentials/v1",
  "https://veritas.croo.network/contexts/verification/v1",
] as const;

/** VC type identifiers for verification credentials. */
export const VERIFICATION_VC_TYPES = [
  "VerifiableCredential",
  "VeritasVerificationCredential",
] as const;

export interface BuildVerificationVcOptions {
  readonly issuer: Did | { readonly id: Did; readonly name?: string };
  readonly subjectDid?: Did;
  readonly report: Report;
  readonly expiresInMs?: number;
  readonly credentialStatus?: VcStatus;
  readonly clock?: Clock;
}

/**
 * Construct an unsigned VerificationVerifiableCredential from a Report.
 * A proof must be attached separately via the issuer module.
 */
export function buildVerificationVc(
  options: BuildVerificationVcOptions,
): Result<VerificationVerifiableCredential, CredentialError> {
  const { issuer, subjectDid, report, expiresInMs, credentialStatus, clock = systemClock } = options;

  const now: IsoTimestamp = epochToIso(clock.now());

  // Determine overall verdict from counts
  const { supported, refuted, unverifiable } = report.counts;
  const totalClaims = supported + refuted + unverifiable;
  const verdict =
    totalClaims === 0
      ? "UNVERIFIABLE"
      : refuted > supported
        ? "REFUTED"
        : supported > 0
          ? "SUPPORTED"
          : "UNVERIFIABLE";

  const subject: VerificationCredentialSubject = {
    ...(subjectDid !== undefined ? { id: subjectDid } : {}),
    reportId: report.id,
    verificationId: report.verificationId,
    contentHash: report.contentHash,
    trustScore: clampScore(report.trustScore / 100),
    verdict,
    claimCount: report.counts.supported + report.counts.refuted + report.counts.unverifiable,
    sourceCount: report.provenance.sourceCount,
    model: report.provenance.model,
    verifierVersion: report.provenance.verifierVersion,
    issuedAt: now,
  };

  const vc: VerificationVerifiableCredential = {
    "@context": VERIFICATION_VC_CONTEXTS,
    id: newVcId(),
    type: VERIFICATION_VC_TYPES,
    issuer,
    issuanceDate: now,
    ...(expiresInMs !== undefined
      ? { expirationDate: epochToIso(Date.now() + expiresInMs) }
      : {}),
    credentialSubject: subject,
    ...(credentialStatus !== undefined ? { credentialStatus } : {}),
  };

  return ok(vc);
}

/**
 * Extract and validate the VerificationCredentialSubject from a VC.
 * Returns an error if the subject does not conform to the expected schema.
 */
export function extractVerificationSubject(
  vc: VerificationVerifiableCredential,
): Result<VerificationCredentialSubject, InvalidCredentialSubjectError> {
  const parsed = VerificationCredentialSubjectSchema.safeParse(vc.credentialSubject);
  if (!parsed.success) {
    return err(
      new InvalidCredentialSubjectError(
        `Invalid VerificationCredentialSubject: ${parsed.error.message}`,
      ),
    );
  }
  return ok(parsed.data as VerificationCredentialSubject);
}
