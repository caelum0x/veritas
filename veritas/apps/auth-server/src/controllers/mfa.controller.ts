// MFA controller: challenge issuance and verification endpoints for enrolled factors.

import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { isOk, isErr, ok, err, type Result, type AppError, ValidationError, UnauthorizedError, InternalError } from "@veritas/core";
import {
  type ChallengeRepository,
  type MfaFactor,
  type MfaChallenge,
  issueChallenge,
  type IssueChallengeInput,
  isChallengeExpired,
  isChallengeExhausted,
  incrementAttempt,
  completeChallenge,
  failChallenge,
  type WebAuthnPort,
  type WebAuthnAssertion,
  type WebAuthnAuthenticationOptions,
} from "@veritas/mfa";

/** Minimal port for user session provisioning needed by SSO controller. */
export interface UserProvisionPort {
  findOrProvision(params: {
    email: string;
    displayName: string;
    externalId: string;
    providerId: string;
  }): Promise<Result<{ userId: string; organizationId: string; sessionId: string }, AppError>>;
}

/** TOTP/HOTP verification port. */
export interface TotpPort {
  verify(secret: string, token: string, options?: { window?: number; period?: number }): boolean;
}

/** Recovery code verification port. */
export interface RecoveryPort {
  verify(codeHash: string, candidate: string): Promise<boolean>;
}

/** Dependencies required for MFA verification. */
export interface VerifyDeps {
  challenges: ChallengeRepository;
  findFactor: (id: string) => Promise<MfaFactor | null>;
  totp: TotpPort;
  recovery: RecoveryPort;
  webauthn: WebAuthnPort;
  updateFactor: (factor: MfaFactor) => Promise<MfaFactor>;
  now?: Date;
}

/** Input for verifying an MFA challenge. */
export interface VerifyInput {
  readonly challengeId: string;
  readonly factorId: string;
  readonly userId: string;
  readonly payload:
    | { kind: "totp"; token: string }
    | { kind: "hotp"; token: string }
    | { kind: "webauthn"; options: WebAuthnAuthenticationOptions; assertion: WebAuthnAssertion }
    | { kind: "recovery"; code: string };
}

/** Verify an MFA challenge against the appropriate factor handler. */
async function verifyMfa(
  input: VerifyInput,
  deps: VerifyDeps,
): Promise<Result<MfaChallenge, AppError>> {
  const now = deps.now ?? new Date();

  const challenge = await deps.challenges.findById(input.challengeId);
  if (!challenge) {
    return err(new ValidationError({ message: "Challenge not found" }));
  }
  if (challenge.userId !== input.userId) {
    return err(new UnauthorizedError({ message: "Challenge does not belong to user" }));
  }
  if (challenge.factorId !== input.factorId) {
    return err(new ValidationError({ message: "Factor mismatch" }));
  }
  if (challenge.status !== "pending") {
    return err(new ValidationError({ message: `Challenge is ${challenge.status}` }));
  }
  if (isChallengeExpired(challenge, now)) {
    await deps.challenges.update(failChallenge(challenge));
    return err(new ValidationError({ message: "Challenge expired" }));
  }
  if (isChallengeExhausted(challenge)) {
    await deps.challenges.update(failChallenge(challenge));
    return err(new UnauthorizedError({ message: "Too many failed attempts" }));
  }

  const factor = await deps.findFactor(input.factorId);
  if (!factor) {
    return err(new ValidationError({ message: "Factor not found" }));
  }
  if (factor.status !== "active") {
    return err(new ValidationError({ message: `Factor is ${factor.status}` }));
  }
  if (factor.kind !== input.payload.kind) {
    return err(new ValidationError({ message: "Factor kind mismatch" }));
  }

  let verified = false;

  if (input.payload.kind === "totp" && factor.kind === "totp") {
    verified = deps.totp.verify(factor.secret, input.payload.token, { period: factor.period });
  } else if (input.payload.kind === "hotp" && factor.kind === "hotp") {
    verified = deps.totp.verify(factor.secret, input.payload.token);
    if (verified) {
      await deps.updateFactor({ ...factor, counter: factor.counter + 1 });
    }
  } else if (input.payload.kind === "webauthn" && factor.kind === "webauthn") {
    const storedCred = {
      credentialId: factor.credentialId,
      publicKey: factor.publicKey,
      signCount: factor.signCount,
      aaguid: factor.aaguid,
      transports: factor.transports,
      createdAt: factor.createdAt,
    };
    const webAuthnResult = await deps.webauthn.verifyAuthentication(
      input.payload.options,
      input.payload.assertion,
      storedCred,
    );
    if (webAuthnResult.verified) {
      await deps.updateFactor({ ...factor, signCount: webAuthnResult.newSignCount ?? factor.signCount + 1 });
      verified = true;
    }
  } else if (input.payload.kind === "recovery" && factor.kind === "recovery") {
    for (const hash of factor.codeHashes) {
      if (await deps.recovery.verify(hash, input.payload.code)) {
        verified = true;
        const newHashes = factor.codeHashes.filter((h) => h !== hash);
        await deps.updateFactor({ ...factor, codeHashes: newHashes, usedCount: factor.usedCount + 1 });
        break;
      }
    }
  } else {
    return err(new InternalError({ message: "Unsupported factor kind" }));
  }

  const withAttempt = incrementAttempt(challenge);

  if (!verified) {
    const tooMany = isChallengeExhausted(withAttempt);
    const updated = tooMany ? failChallenge(withAttempt) : withAttempt;
    await deps.challenges.update(updated);
    return err(
      tooMany
        ? new UnauthorizedError({ message: "Too many failed attempts" })
        : new UnauthorizedError({ message: "Invalid MFA credential" }),
    );
  }

  const completed = completeChallenge(withAttempt, now);
  await deps.challenges.update(completed);
  return ok(completed);
}

const IssueChallengeBodySchema = z.object({
  userId: z.string().min(1),
  factorId: z.string().min(1),
});

const VerifyBodySchema = z.object({
  challengeId: z.string().min(1),
  factorId: z.string().min(1),
  userId: z.string().min(1),
  payload: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("totp"), token: z.string().min(6).max(8) }),
    z.object({ kind: z.literal("hotp"), token: z.string().min(6).max(8) }),
    z.object({
      kind: z.literal("webauthn"),
      options: z.record(z.unknown()),
      assertion: z.record(z.unknown()),
    }),
    z.object({ kind: z.literal("recovery"), code: z.string().min(1) }),
  ]),
});

function idGen(): string {
  return `ch_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export class MfaController {
  constructor(private readonly deps: VerifyDeps) {}

  issueChallenge = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const parsed = IssueChallengeBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "userId and factorId are required" },
      });
      return;
    }

    const { userId, factorId } = parsed.data;

    const factor = await this.deps.findFactor(factorId).catch((e: unknown) => {
      next(e);
      return null;
    });
    if (factor === null) return;

    if (!factor) {
      res.status(404).json({
        success: false,
        error: { code: "FACTOR_NOT_FOUND", message: "MFA factor not found" },
      });
      return;
    }

    if (factor.userId !== userId) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Factor does not belong to user" },
      });
      return;
    }

    const input: IssueChallengeInput = {
      userId,
      factorId,
      factorKind: factor.kind,
    };

    const result = issueChallenge(input, idGen);
    if (isErr(result)) {
      next(result.error);
      return;
    }

    const challenge = await this.deps.challenges.create(result.value).catch((e: unknown) => {
      next(e);
      return null;
    });
    if (challenge === null) return;

    res.status(201).json({
      success: true,
      data: {
        challengeId: challenge.id,
        factorKind: challenge.factorKind,
        expiresAt: challenge.expiresAt,
      },
    });
  };

  verify = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const parsed = VerifyBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid MFA verify body" },
      });
      return;
    }

    const input: VerifyInput = {
      challengeId: parsed.data.challengeId,
      factorId: parsed.data.factorId,
      userId: parsed.data.userId,
      payload: parsed.data.payload as VerifyInput["payload"],
    };

    const result = await verifyMfa(input, this.deps).catch((e: unknown) => {
      next(e);
      return null;
    });
    if (result === null) return;

    if (isErr(result)) {
      const errMsg = result.error.message;
      const status = errMsg.includes("expired") ? 410
        : errMsg.includes("attempts") ? 429
        : 401;
      res.status(status).json({
        success: false,
        error: { code: "MFA_VERIFY_FAILED", message: errMsg },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        challengeId: result.value.id,
        status: result.value.status,
        completedAt: result.value.completedAt,
      },
    });
  };
}
