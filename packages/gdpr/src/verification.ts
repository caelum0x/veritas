// Requester identity verification for GDPR data subject requests.

import { type Result, ok, err, tryAsync } from "@veritas/core";
import { type Clock } from "@veritas/core";
import {
  type DataSubject,
  type IdentityVerificationResult,
  type VerificationMethod,
} from "./types.js";
import { IdentityVerificationFailedError } from "./errors.js";

export interface VerificationToken {
  readonly token: string;
  readonly subjectId: string;
  readonly method: VerificationMethod;
  readonly expiresAt: string;
}

/** Port interface for OTP / identity provider backend. */
export interface IdentityVerifierPort {
  sendOtp(email: string, method: VerificationMethod): Promise<{ tokenId: string }>;
  verifyOtp(tokenId: string, otp: string): Promise<{ valid: boolean; reason?: string }>;
  verifyGovernmentId(subjectId: string, documentRef: string): Promise<{ valid: boolean; confidence: number; reason?: string }>;
}

/** In-memory mock identity verifier for testing / local dev. */
export class MockIdentityVerifier implements IdentityVerifierPort {
  private readonly otpStore = new Map<string, { otp: string; email: string }>();

  async sendOtp(email: string, _method: VerificationMethod): Promise<{ tokenId: string }> {
    const tokenId = `mock-token-${email}-${Date.now()}`;
    this.otpStore.set(tokenId, { otp: "123456", email });
    return { tokenId };
  }

  async verifyOtp(tokenId: string, otp: string): Promise<{ valid: boolean; reason?: string }> {
    const entry = this.otpStore.get(tokenId);
    if (!entry) return { valid: false, reason: "Token not found" };
    if (entry.otp !== otp) return { valid: false, reason: "OTP mismatch" };
    this.otpStore.delete(tokenId);
    return { valid: true };
  }

  async verifyGovernmentId(_subjectId: string, _documentRef: string): Promise<{ valid: boolean; confidence: number; reason?: string }> {
    return { valid: true, confidence: 0.95 };
  }
}

export class IdentityVerificationService {
  constructor(
    private readonly verifier: IdentityVerifierPort,
    private readonly clock: Clock,
  ) {}

  async initiateVerification(
    subject: DataSubject,
    method: VerificationMethod,
  ): Promise<Result<{ tokenId: string }, IdentityVerificationFailedError>> {
    const result = await tryAsync(async () => {
      const { tokenId } = await this.verifier.sendOtp(subject.email, method);
      return { tokenId };
    });

    if (result.ok) return ok(result.value);
    return err(new IdentityVerificationFailedError(String(result.error)));
  }

  async verifyWithOtp(
    subject: DataSubject,
    tokenId: string,
    otp: string,
    method: VerificationMethod,
  ): Promise<Result<IdentityVerificationResult, IdentityVerificationFailedError>> {
    const result = await tryAsync(async () => {
      return this.verifier.verifyOtp(tokenId, otp);
    });

    if (!result.ok) {
      return err(new IdentityVerificationFailedError(String(result.error)));
    }

    const { valid, reason } = result.value;
    const now = this.clock.nowIso();

    if (!valid) {
      return ok({
        verified: false,
        method,
        failureReason: reason ?? "OTP verification failed",
      } satisfies IdentityVerificationResult);
    }

    return ok({
      verified: true,
      method,
      verifiedAt: now,
      confidence: 1.0,
    } satisfies IdentityVerificationResult);
  }

  async verifyWithGovernmentId(
    subject: DataSubject,
    documentRef: string,
  ): Promise<Result<IdentityVerificationResult, IdentityVerificationFailedError>> {
    const result = await tryAsync(async () => {
      return this.verifier.verifyGovernmentId(subject.id, documentRef);
    });

    if (!result.ok) {
      return err(new IdentityVerificationFailedError(String(result.error)));
    }

    const { valid, confidence, reason } = result.value;
    const now = this.clock.nowIso();

    return ok({
      verified: valid,
      method: "government_id" as VerificationMethod,
      verifiedAt: valid ? now : undefined,
      confidence,
      failureReason: valid ? undefined : (reason ?? "Government ID verification failed"),
    } satisfies IdentityVerificationResult);
  }
}
