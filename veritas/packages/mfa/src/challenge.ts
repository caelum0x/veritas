// MFA challenge lifecycle — issue, track, and expire per-factor challenges.

import { z } from "zod";
import { type Result, ok, err, type AppError, InternalError } from "@veritas/core";
import { type FactorKind, FactorKindSchema } from "./factor.js";

export const ChallengeStatusSchema = z.enum(["pending", "completed", "expired", "failed"]);
export type ChallengeStatus = z.infer<typeof ChallengeStatusSchema>;

export const MfaChallengeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  factorId: z.string(),
  factorKind: FactorKindSchema,
  status: ChallengeStatusSchema,
  nonce: z.string().optional(), // for webauthn
  expiresAt: z.string(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  attemptCount: z.number().int().nonnegative().default(0),
  maxAttempts: z.number().int().positive().default(5),
});
export type MfaChallenge = z.infer<typeof MfaChallengeSchema>;

export interface ChallengeRepository {
  findById(id: string): Promise<MfaChallenge | null>;
  findPendingByUserId(userId: string): Promise<MfaChallenge[]>;
  create(challenge: MfaChallenge): Promise<MfaChallenge>;
  update(challenge: MfaChallenge): Promise<MfaChallenge>;
  deleteExpired(): Promise<number>;
}

export interface IssueChallengeInput {
  readonly userId: string;
  readonly factorId: string;
  readonly factorKind: FactorKind;
  readonly ttlSeconds?: number;
  readonly maxAttempts?: number;
  readonly nonce?: string;
}

export function issueChallenge(
  input: IssueChallengeInput,
  idGen: () => string,
  now: Date = new Date()
): Result<MfaChallenge, AppError> {
  const ttl = input.ttlSeconds ?? 300;
  const expiresAt = new Date(now.getTime() + ttl * 1000);

  const challenge: MfaChallenge = {
    id: idGen(),
    userId: input.userId,
    factorId: input.factorId,
    factorKind: input.factorKind,
    status: "pending",
    nonce: input.nonce,
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
    completedAt: null,
    attemptCount: 0,
    maxAttempts: input.maxAttempts ?? 5,
  };

  const parsed = MfaChallengeSchema.safeParse(challenge);
  if (!parsed.success) {
    return err(new InternalError({ message: "Failed to construct challenge", cause: parsed.error }));
  }

  return ok(parsed.data);
}

export function isChallengeExpired(challenge: MfaChallenge, now: Date = new Date()): boolean {
  return now > new Date(challenge.expiresAt);
}

export function isChallengeExhausted(challenge: MfaChallenge): boolean {
  return challenge.attemptCount >= challenge.maxAttempts;
}

export function incrementAttempt(challenge: MfaChallenge): MfaChallenge {
  return { ...challenge, attemptCount: challenge.attemptCount + 1 };
}

export function completeChallenge(challenge: MfaChallenge, now: Date = new Date()): MfaChallenge {
  return { ...challenge, status: "completed", completedAt: now.toISOString() };
}

export function failChallenge(challenge: MfaChallenge): MfaChallenge {
  return { ...challenge, status: "failed" };
}

export function expireChallenge(challenge: MfaChallenge): MfaChallenge {
  return { ...challenge, status: "expired" };
}
