// MFA service — wires @veritas/mfa package functions to repository deps for factor enrollment, challenge lifecycle, and verification.

import { randomBytes } from "node:crypto";
import { ok, err, isOk, isErr, type Result, ValidationError, NotFoundError, UnauthorizedError, InternalError, type AppError } from "@veritas/core";
import {
  base32Encode,
  buildTotpUri,
  issueChallenge,
  isChallengeExpired,
  isChallengeExhausted,
  incrementAttempt,
  completeChallenge,
  failChallenge,
  verifyTotp,
  DEFAULT_POLICY,
  type MfaFactor,
  type MfaChallenge,
  type TotpEnrollResult,
  type MfaEnrollmentStatus,
  type FactorRepository,
  type ChallengeRepository,
  type PolicyRepository,
  type IssueChallengeInput,
} from "@veritas/mfa";
import type { Logger } from "@veritas/observability";
import type { EnrollTotpBody, VerifyMfaBody } from "./mfa.schema.js";

export interface MfaServiceDeps {
  readonly factorRepository: FactorRepository;
  readonly challengeRepository: ChallengeRepository;
  readonly policyRepository: PolicyRepository;
  readonly logger: Logger;
}

function newFactorId(): string {
  return `fac_${randomBytes(12).toString("hex")}`;
}

function newChallengeId(): string {
  return `ch_${randomBytes(12).toString("hex")}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export class MfaService {
  private readonly factorRepo: FactorRepository;
  private readonly challengeRepo: ChallengeRepository;
  private readonly policyRepo: PolicyRepository;
  private readonly logger: Logger;

  constructor(deps: MfaServiceDeps) {
    this.factorRepo = deps.factorRepository;
    this.challengeRepo = deps.challengeRepository;
    this.policyRepo = deps.policyRepository;
    this.logger = deps.logger;
  }

  async enrollTotp(body: EnrollTotpBody): Promise<Result<TotpEnrollResult, AppError>> {
    const rawSecret = randomBytes(20);
    const secret = base32Encode(rawSecret);
    const now = nowIso();
    const factorId = newFactorId();

    const factor: MfaFactor = {
      id: factorId,
      kind: "totp",
      userId: body.userId,
      label: body.label,
      secret,
      algorithm: body.algorithm ?? "SHA1",
      digits: body.digits ?? 6,
      period: body.period ?? 30,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      verifiedAt: null,
    };

    try {
      await this.factorRepo.create(factor);
    } catch (e) {
      this.logger.error("Failed to create TOTP factor", { error: e });
      return err(new InternalError({ message: "Failed to create MFA factor" }));
    }

    const otpauthUri = buildTotpUri(secret, body.label, body.issuer ?? "Veritas", {
      algorithm: factor.algorithm,
      digits: factor.digits as 6 | 7 | 8,
      period: factor.period,
    });

    return ok({ factorId, secret, otpauthUri });
  }

  async listFactors(userId: string, activeOnly: boolean): Promise<Result<MfaFactor[], AppError>> {
    try {
      const factors = activeOnly
        ? await this.factorRepo.findActiveByUserId(userId as any)
        : await this.factorRepo.findByUserId(userId as any);
      return ok(factors);
    } catch (e) {
      this.logger.error("Failed to list MFA factors", { error: e, userId });
      return err(new InternalError({ message: "Failed to list MFA factors" }));
    }
  }

  async deleteFactor(factorId: string, userId: string): Promise<Result<void, AppError>> {
    const factor = await this.factorRepo.findById(factorId).catch(() => null);
    if (!factor) {
      return err(new NotFoundError({ message: "MFA factor not found" }));
    }
    if (factor.userId !== userId) {
      return err(new UnauthorizedError({ message: "Factor does not belong to user" }));
    }
    try {
      await this.factorRepo.delete(factorId);
      return ok(undefined);
    } catch (e) {
      this.logger.error("Failed to delete MFA factor", { error: e, factorId });
      return err(new InternalError({ message: "Failed to delete MFA factor" }));
    }
  }

  async issueChallenge(userId: string, factorId: string): Promise<Result<MfaChallenge, AppError>> {
    const factor = await this.factorRepo.findById(factorId).catch(() => null);
    if (!factor) {
      return err(new NotFoundError({ message: "MFA factor not found" }));
    }
    if (factor.userId !== userId) {
      return err(new UnauthorizedError({ message: "Factor does not belong to user" }));
    }
    if (factor.status !== "active" && factor.status !== "pending") {
      return err(new ValidationError({ message: `Factor is ${factor.status}` }));
    }

    const input: IssueChallengeInput = {
      userId,
      factorId,
      factorKind: factor.kind,
      ttlSeconds: 300,
      maxAttempts: 5,
    };

    const result = issueChallenge(input, newChallengeId);
    if (isErr(result)) {
      return err(result.error);
    }

    try {
      const challenge = await this.challengeRepo.create(result.value);
      return ok(challenge);
    } catch (e) {
      this.logger.error("Failed to persist MFA challenge", { error: e });
      return err(new InternalError({ message: "Failed to create MFA challenge" }));
    }
  }

  async verify(body: VerifyMfaBody): Promise<Result<MfaChallenge, AppError>> {
    const now = new Date();
    const challenge = await this.challengeRepo.findById(body.challengeId).catch(() => null);
    if (!challenge) {
      return err(new NotFoundError({ message: "MFA challenge not found" }));
    }
    if (challenge.userId !== body.userId) {
      return err(new UnauthorizedError({ message: "Challenge does not belong to user" }));
    }
    if (challenge.factorId !== body.factorId) {
      return err(new ValidationError({ message: "Factor mismatch" }));
    }
    if (challenge.status !== "pending") {
      return err(new ValidationError({ message: `Challenge is ${challenge.status}` }));
    }
    if (isChallengeExpired(challenge, now)) {
      await this.challengeRepo.update(failChallenge(challenge)).catch(() => undefined);
      return err(new ValidationError({ message: "Challenge has expired" }));
    }
    if (isChallengeExhausted(challenge)) {
      await this.challengeRepo.update(failChallenge(challenge)).catch(() => undefined);
      return err(new UnauthorizedError({ message: "Too many failed attempts" }));
    }

    const factor = await this.factorRepo.findById(body.factorId).catch(() => null);
    if (!factor) {
      return err(new NotFoundError({ message: "MFA factor not found" }));
    }
    if (factor.status !== "active") {
      return err(new ValidationError({ message: `Factor is ${factor.status}` }));
    }

    let verified = false;

    if (body.payload.kind === "totp" && factor.kind === "totp") {
      const result = verifyTotp(body.payload.token, factor.secret, {
        digits: factor.digits,
        period: factor.period,
      });
      verified = result.valid;
    } else if (body.payload.kind === "hotp" && factor.kind === "hotp") {
      const result = verifyTotp(body.payload.token, factor.secret, { digits: factor.digits });
      verified = result.valid;
      if (verified) {
        await this.factorRepo.update({ ...factor, counter: factor.counter + 1 }).catch(() => undefined);
      }
    } else if (body.payload.kind === "recovery" && factor.kind === "recovery") {
      // Recovery code comparison — factor.codeHashes are plaintext hashes stored; real bcrypt would go here
      for (const hash of factor.codeHashes) {
        if (hash === body.payload.code) {
          verified = true;
          const newHashes = factor.codeHashes.filter((h) => h !== hash);
          await this.factorRepo.update({ ...factor, codeHashes: newHashes, usedCount: factor.usedCount + 1 }).catch(() => undefined);
          break;
        }
      }
    } else {
      return err(new ValidationError({ message: "Factor kind does not match challenge payload" }));
    }

    const withAttempt = incrementAttempt(challenge);

    if (!verified) {
      const exhausted = isChallengeExhausted(withAttempt);
      const updated = exhausted ? failChallenge(withAttempt) : withAttempt;
      await this.challengeRepo.update(updated).catch(() => undefined);
      return err(
        exhausted
          ? new UnauthorizedError({ message: "Too many failed attempts" })
          : new UnauthorizedError({ message: "Invalid MFA credential" }),
      );
    }

    const completed = completeChallenge(withAttempt, now);
    const saved = await this.challengeRepo.update(completed).catch(() => null);
    if (!saved) {
      return err(new InternalError({ message: "Failed to persist completed challenge" }));
    }
    return ok(saved);
  }

  async getEnrollmentStatus(userId: string): Promise<Result<MfaEnrollmentStatus, AppError>> {
    try {
      const factors = await this.factorRepo.findByUserId(userId as any);
      const activeFactors = factors.filter((f) => f.status === "active");
      const policy = await this.policyRepo.findByName("default").catch(() => null);
      const requirement = policy?.requirement ?? DEFAULT_POLICY.requirement;

      const status: MfaEnrollmentStatus = {
        userId,
        hasActiveFactors: activeFactors.length > 0,
        activeFactorCount: activeFactors.length,
        factorKinds: [...new Set(activeFactors.map((f) => f.kind))] as MfaEnrollmentStatus["factorKinds"],
        policyRequirement: requirement,
        policyName: policy?.name ?? "default",
      };
      return ok(status);
    } catch (e) {
      this.logger.error("Failed to compute enrollment status", { error: e, userId });
      return err(new InternalError({ message: "Failed to get enrollment status" }));
    }
  }
}
