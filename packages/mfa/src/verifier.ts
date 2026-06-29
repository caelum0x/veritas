// MFA verifier — dispatches verification to the appropriate factor handler.

import { type Result, ok, err, type AppError, ValidationError, UnauthorizedError, InternalError } from "@veritas/core";
import { type MfaFactor } from "./factor.js";
import {
  type MfaChallenge,
  type ChallengeRepository,
  isChallengeExpired,
  isChallengeExhausted,
  incrementAttempt,
  completeChallenge,
  failChallenge,
} from "./challenge.js";
import {
  type WebAuthnPort,
  type WebAuthnAssertion,
  type WebAuthnAuthenticationOptions,
} from "./webauthn-port.js";

export interface TotpPort {
  verify(secret: string, token: string, options?: { window?: number; period?: number }): boolean;
}

export interface RecoveryPort {
  verify(codeHash: string, candidate: string): Promise<boolean>;
}

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

export interface VerifyDeps {
  challenges: ChallengeRepository;
  findFactor: (id: string) => Promise<MfaFactor | null>;
  totp: TotpPort;
  recovery: RecoveryPort;
  webauthn: WebAuthnPort;
  updateFactor: (factor: MfaFactor) => Promise<MfaFactor>;
  now?: Date;
}

export async function verifyMfa(
  input: VerifyInput,
  deps: VerifyDeps
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
    verified = deps.totp.verify(factor.secret, input.payload.token, {
      period: factor.period,
    });
  } else if (input.payload.kind === "hotp" && factor.kind === "hotp") {
    verified = deps.totp.verify(factor.secret, input.payload.token);
    if (verified) {
      const updated = { ...factor, counter: factor.counter + 1 };
      await deps.updateFactor(updated);
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
    const result = await deps.webauthn.verifyAuthentication(
      input.payload.options,
      input.payload.assertion,
      storedCred
    );
    if (result.verified) {
      const updated = { ...factor, signCount: result.newSignCount ?? factor.signCount + 1 };
      await deps.updateFactor(updated);
      verified = true;
    }
  } else if (input.payload.kind === "recovery" && factor.kind === "recovery") {
    for (const hash of factor.codeHashes) {
      if (await deps.recovery.verify(hash, input.payload.code)) {
        verified = true;
        const newHashes = factor.codeHashes.filter((h) => h !== hash);
        const updated = {
          ...factor,
          codeHashes: newHashes,
          usedCount: factor.usedCount + 1,
        };
        await deps.updateFactor(updated);
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
        : new UnauthorizedError({ message: "Invalid MFA credential" })
    );
  }

  const completed = completeChallenge(withAttempt, now);
  await deps.challenges.update(completed);
  return ok(completed);
}
