// Consent manager: orchestrates consent recording, withdrawal, and compliance checks.
import { Result, ok, err, AppError, IsoTimestamp, epochToIso } from "@veritas/core";
import { Consent, CreateConsent, makeConsent } from "./consent.js";
import { Purpose } from "./purpose.js";
import { TermsVersion } from "./terms.js";
import { Agreement, CreateAgreement, makeAgreement, revokeAgreement } from "./agreement.js";

export interface ConsentStore {
  saveConsent(consent: Consent): Promise<Result<Consent>>;
  findConsentsByUser(userId: string): Promise<Result<Consent[]>>;
  findConsentByUserAndPurpose(userId: string, purposeId: string): Promise<Result<Consent | null>>;
  saveAgreement(agreement: Agreement): Promise<Result<Agreement>>;
  findAgreementByUser(userId: string): Promise<Result<Agreement | null>>;
  findTermsByVersion(version: string): Promise<Result<TermsVersion | null>>;
  findPurposeById(purposeId: string): Promise<Result<Purpose | null>>;
}

export class ConsentManager {
  constructor(
    private readonly store: ConsentStore,
    private readonly clock: () => IsoTimestamp = () =>
      epochToIso(Date.now())
  ) {}

  async grantConsent(input: CreateConsent): Promise<Result<Consent>> {
    const now = this.clock();

    const purposeResult = await this.store.findPurposeById(input.purposeId);
    if (!purposeResult.ok) return purposeResult;
    if (!purposeResult.value) {
      return err(new AppError("NOT_FOUND", 404, `Purpose ${input.purposeId} not found`));
    }

    const termsResult = await this.store.findTermsByVersion(input.termsVersion);
    if (!termsResult.ok) return termsResult;
    if (!termsResult.value) {
      return err(new AppError("NOT_FOUND", 404, `Terms version ${input.termsVersion} not found`));
    }

    const consent = makeConsent({ ...input, status: "granted" }, now);
    return this.store.saveConsent(consent);
  }

  async denyConsent(input: CreateConsent): Promise<Result<Consent>> {
    const now = this.clock();
    const consent = makeConsent({ ...input, status: "denied" }, now);
    return this.store.saveConsent(consent);
  }

  async withdrawConsent(
    userId: string,
    purposeId: string
  ): Promise<Result<Consent>> {
    const now = this.clock();

    const existing = await this.store.findConsentByUserAndPurpose(userId, purposeId);
    if (!existing.ok) return existing;
    if (!existing.value) {
      return err(new AppError("NOT_FOUND", 404, `No consent found for user ${userId} and purpose ${purposeId}`));
    }

    const withdrawn: Consent = {
      ...existing.value,
      status: "withdrawn",
      withdrawnAt: now,
      updatedAt: now,
    };
    return this.store.saveConsent(withdrawn);
  }

  async recordAgreement(input: CreateAgreement): Promise<Result<Agreement>> {
    const now = this.clock();

    const termsResult = await this.store.findTermsByVersion(input.termsVersion);
    if (!termsResult.ok) return termsResult;
    if (!termsResult.value) {
      return err(new AppError("NOT_FOUND", 404, `Terms version ${input.termsVersion} not found`));
    }

    const existingResult = await this.store.findAgreementByUser(input.userId);
    if (!existingResult.ok) return existingResult;

    const agreement = makeAgreement(input, now);
    return this.store.saveAgreement(agreement);
  }

  async revokeAgreement(userId: string): Promise<Result<Agreement>> {
    const now = this.clock();

    const existingResult = await this.store.findAgreementByUser(userId);
    if (!existingResult.ok) return existingResult;
    if (!existingResult.value) {
      return err(new AppError("NOT_FOUND", 404, `No active agreement found for user ${userId}`));
    }

    const revoked = revokeAgreement(existingResult.value, now);
    return this.store.saveAgreement(revoked);
  }

  async hasValidConsent(userId: string, purposeId: string): Promise<Result<boolean>> {
    const result = await this.store.findConsentByUserAndPurpose(userId, purposeId);
    if (!result.ok) return result;
    return ok(result.value?.status === "granted");
  }

  async getUserConsents(userId: string): Promise<Result<Consent[]>> {
    return this.store.findConsentsByUser(userId);
  }
}
