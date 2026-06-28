// Credential subject types and constructors for Veritas verifiable credentials.
import { z } from "zod";
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { Verdict } from "@veritas/core";

export class SubjectError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "SubjectError";
  }
}

/** Base credential subject — every VC subject may carry an optional id (DID or URL). */
export interface CredentialSubjectBase {
  readonly id?: string;
  readonly [key: string]: unknown;
}

/** Subject for a VerificationCredential issued by the Veritas CAP agent. */
export interface VerificationCredentialSubject extends CredentialSubjectBase {
  readonly id: string;
  readonly type: "VerificationSubject";
  readonly verificationId: string;
  readonly reportId: string;
  readonly claimText: string;
  readonly verdict: Verdict;
  readonly confidence: number;
  readonly sourceUrls: readonly string[];
  readonly verifiedAt: string;
}

/** Subject for a ClaimCredential wrapping a raw claim. */
export interface ClaimCredentialSubject extends CredentialSubjectBase {
  readonly id?: string;
  readonly type: "ClaimSubject";
  readonly claimId: string;
  readonly claimText: string;
  readonly submittedAt: string;
  readonly sourceUrl?: string;
}

const verificationSubjectSchema = z.object({
  id: z.string(),
  type: z.literal("VerificationSubject"),
  verificationId: z.string(),
  reportId: z.string(),
  claimText: z.string().min(1),
  verdict: z.enum(["TRUE", "FALSE", "UNVERIFIABLE", "MISLEADING", "DISPUTED"]),
  confidence: z.number().min(0).max(1),
  sourceUrls: z.array(z.string().url()),
  verifiedAt: z.string(),
});

const claimSubjectSchema = z.object({
  id: z.string().optional(),
  type: z.literal("ClaimSubject"),
  claimId: z.string(),
  claimText: z.string().min(1),
  submittedAt: z.string(),
  sourceUrl: z.string().url().optional(),
});

/** Parse and validate a VerificationCredentialSubject. */
export function parseVerificationSubject(raw: unknown): Result<VerificationCredentialSubject, SubjectError> {
  const result = verificationSubjectSchema.safeParse(raw);
  if (!result.success) {
    return err(new SubjectError("Invalid verification subject: " + result.error.message));
  }
  return ok(Object.freeze(result.data) as VerificationCredentialSubject);
}

/** Parse and validate a ClaimCredentialSubject. */
export function parseClaimSubject(raw: unknown): Result<ClaimCredentialSubject, SubjectError> {
  const result = claimSubjectSchema.safeParse(raw);
  if (!result.success) {
    return err(new SubjectError("Invalid claim subject: " + result.error.message));
  }
  return ok(Object.freeze(result.data) as ClaimCredentialSubject);
}

/** Construct a VerificationCredentialSubject from validated fields. */
export function makeVerificationSubject(
  fields: Omit<VerificationCredentialSubject, "type">,
): VerificationCredentialSubject {
  const subject = { ...fields, type: "VerificationSubject" as const } as VerificationCredentialSubject;
  return Object.freeze(subject);
}

/** Construct a ClaimCredentialSubject from validated fields. */
export function makeClaimSubject(fields: Omit<ClaimCredentialSubject, "type">): ClaimCredentialSubject {
  const subject = { ...fields, type: "ClaimSubject" as const } as ClaimCredentialSubject;
  return Object.freeze(subject);
}

/** Type guard for VerificationCredentialSubject. */
export function isVerificationSubject(s: CredentialSubjectBase): s is VerificationCredentialSubject {
  return s["type"] === "VerificationSubject";
}

/** Type guard for ClaimCredentialSubject. */
export function isClaimSubject(s: CredentialSubjectBase): s is ClaimCredentialSubject {
  return s["type"] === "ClaimSubject";
}
